/**
 * Orchestrates the full lifecycle: signaling handshake -> WebRTC connect ->
 * DataChannel open -> heartbeat -> automatic reconnection on drop.
 *
 * This is the ONLY networking class the React hook layer talks to. It
 * exposes a small, UI-friendly surface (status changes + validated
 * GameMessages in, GameMessages out) and hides every protocol/ICE detail
 * behind it — fulfilling the project's #1 UX rule: the user (and even the
 * UI code) never has to know what an SDP offer or ICE candidate is.
 */
import type { PlayerId } from "@/game/types";
import type { GameMessage } from "@/networking/protocol/messages";
import { createEnvelope, encodeEnvelope, MAX_MESSAGE_BYTES } from "@/networking/protocol/envelope";
import { decodeAndValidate, MessageValidationError } from "@/networking/protocol/validate";
import { buildSignalingUrl, SignalingClient } from "@/networking/signaling/signalingClient";
import type { SignalData } from "@/networking/signaling/types";
import {
  applyRemoteSignal,
  buildIceServers,
  createAnswer,
  createOffer,
  createPeerConnection,
  DATA_CHANNEL_LABEL,
  type IceServerConfig,
} from "@/networking/webrtc/peerConnection";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "failed"
  | "closed";

export interface ConnectionManagerOptions {
  gameId: string;
  role: PlayerId;
  signalingUrl: string;
  extraIceServers?: IceServerConfig[];
  /** Overridable for tests; defaults to real timers. */
  now?: () => number;
}

export interface ConnectionManagerHandlers {
  onStatusChange: (status: ConnectionStatus) => void;
  onMessage: (message: GameMessage) => void;
  /** Fired once, when the manager gives up trying to reconnect. */
  onGiveUp: () => void;
}

const HEARTBEAT_INTERVAL_MS = 5000;
const HEARTBEAT_TIMEOUT_MS = 15000;
const DISCONNECT_GRACE_MS = 10000;
const MAX_RECONNECT_ATTEMPTS = 4;

export class ConnectionManager {
  private readonly opts: ConnectionManagerOptions;
  private readonly handlers: ConnectionManagerHandlers;

  private signaling: SignalingClient;
  private pc: RTCPeerConnection | null = null;
  private channel: RTCDataChannel | null = null;

  private status: ConnectionStatus = "idle";
  private seq = 0;
  private reconnectAttempts = 0;
  private disconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastPongAt = 0;
  private intentionalClose = false;

  constructor(opts: ConnectionManagerOptions, handlers: ConnectionManagerHandlers) {
    this.opts = opts;
    this.handlers = handlers;
    this.signaling = new SignalingClient(buildSignalingUrl(opts.signalingUrl, opts.gameId));
  }

  connect(): void {
    this.intentionalClose = false;
    this.setStatus("connecting");
    this.signaling.connect({
      onOpen: () => {
        if (this.opts.role === "host") {
          this.signaling.createGame(this.opts.gameId);
        } else {
          this.signaling.joinGame(this.opts.gameId);
        }
      },
      onCreated: () => {
        // Host has a room; wait for a guest to join before offering.
      },
      onJoined: () => {
        // Guest is registered; wait for the host's offer.
      },
      onPeerJoined: () => {
        if (this.opts.role === "host") void this.startAsHost();
      },
      onSignal: (data) => void this.handleSignal(data),
      onPeerLeft: () => this.handlePeerLeft(),
      onError: () => this.scheduleReconnectOrGiveUp(),
      onClose: () => {
        if (!this.intentionalClose) this.scheduleReconnectOrGiveUp();
      },
    });
  }

  private async startAsHost(): Promise<void> {
    this.teardownPeer();
    const pc = this.createPc();
    const channel = pc.createDataChannel(DATA_CHANNEL_LABEL, { ordered: true });
    this.bindChannel(channel);
    const offer = await createOffer(pc);
    this.signaling.sendSignal(this.opts.gameId, offer);
  }

  private async handleSignal(data: SignalData): Promise<void> {
    if (data.kind === "offer") {
      this.teardownPeer();
      const pc = this.createPc();
      pc.ondatachannel = (event) => this.bindChannel(event.channel);
      await applyRemoteSignal(pc, data);
      const answer = await createAnswer(pc);
      this.signaling.sendSignal(this.opts.gameId, answer);
      return;
    }
    if (!this.pc) return; // ICE candidate arrived with no peer connection yet — drop it.
    await applyRemoteSignal(this.pc, data);
  }

  private createPc(): RTCPeerConnection {
    const iceServers = buildIceServers(this.opts.extraIceServers);
    const pc = createPeerConnection(iceServers, {
      onIceCandidate: (candidate) => {
        this.signaling.sendSignal(this.opts.gameId, { kind: "ice-candidate", candidate });
      },
      onDataChannel: (channel) => this.bindChannel(channel),
      onConnectionStateChange: (state) => this.handlePcStateChange(state),
    });
    this.pc = pc;
    return pc;
  }

  private bindChannel(channel: RTCDataChannel): void {
    this.channel = channel;
    channel.onopen = () => {
      this.reconnectAttempts = 0;
      this.clearDisconnectTimer();
      this.setStatus("connected");
      this.startHeartbeat();
    };
    channel.onclose = () => this.handleChannelDown();
    channel.onerror = () => this.handleChannelDown();
    channel.onmessage = (event) => this.handleRawMessage(String(event.data));
  }

  private handleRawMessage(raw: string): void {
    try {
      const { message } = decodeAndValidate(raw);
      if (message.type === "PING") {
        this.sendRaw({ type: "PONG" });
        return;
      }
      if (message.type === "PONG") {
        this.lastPongAt = Date.now();
        return;
      }
      this.handlers.onMessage(message);
    } catch (err) {
      if (err instanceof MessageValidationError) {
        // Never let a malformed/hostile message crash the app — just drop it.
        console.warn("[connection] dropped invalid message:", err.message);
        return;
      }
      throw err;
    }
  }

  private handlePcStateChange(state: RTCPeerConnectionState): void {
    if (state === "connected") {
      this.clearDisconnectTimer();
      return;
    }
    if (state === "disconnected") {
      this.setStatus("reconnecting");
      this.scheduleDisconnectGrace();
      return;
    }
    if (state === "failed" || state === "closed") {
      this.handleChannelDown();
    }
  }

  private handleChannelDown(): void {
    if (this.status === "connected" || this.status === "reconnecting") {
      this.setStatus("reconnecting");
      this.scheduleDisconnectGrace();
    }
  }

  private scheduleDisconnectGrace(): void {
    if (this.disconnectTimer) return;
    this.disconnectTimer = setTimeout(() => {
      this.disconnectTimer = null;
      this.hardReconnect();
    }, DISCONNECT_GRACE_MS);
  }

  private clearDisconnectTimer(): void {
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }
  }

  private handlePeerLeft(): void {
    if (this.status === "connected") {
      this.setStatus("reconnecting");
      this.scheduleDisconnectGrace();
    }
  }

  private scheduleReconnectOrGiveUp(): void {
    if (this.intentionalClose) return;
    this.hardReconnect();
  }

  private hardReconnect(): void {
    if (this.intentionalClose) return;
    this.reconnectAttempts += 1;
    if (this.reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
      this.setStatus("failed");
      this.handlers.onGiveUp();
      return;
    }
    this.setStatus("reconnecting");
    this.stopHeartbeat();
    this.teardownPeer();
    this.signaling.close();
    this.signaling = new SignalingClient(buildSignalingUrl(this.opts.signalingUrl, this.opts.gameId));
    // Small backoff before retrying so we don't hammer the signaling server.
    setTimeout(() => this.connect(), 500 * this.reconnectAttempts);
  }

  /** Manually triggered by the UI's "reconnect" button after a failure. */
  reconnect(): void {
    this.reconnectAttempts = 0;
    this.connect();
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.lastPongAt = Date.now();
    this.heartbeatTimer = setInterval(() => {
      if (Date.now() - this.lastPongAt > HEARTBEAT_TIMEOUT_MS) {
        this.handleChannelDown();
        return;
      }
      this.sendRaw({ type: "PING" });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private sendRaw(message: GameMessage): void {
    if (!this.channel || this.channel.readyState !== "open") return;
    this.seq += 1;
    const envelope = createEnvelope(message, this.seq);
    const encoded = encodeEnvelope(envelope);
    if (encoded.length > MAX_MESSAGE_BYTES) {
      console.error("[connection] refusing to send oversized message");
      return;
    }
    this.channel.send(encoded);
  }

  /** Public send used by the game hook for real gameplay messages. */
  send(message: GameMessage): void {
    this.sendRaw(message);
  }

  private teardownPeer(): void {
    if (this.channel) {
      this.channel.onopen = null;
      this.channel.onclose = null;
      this.channel.onerror = null;
      this.channel.onmessage = null;
      try {
        this.channel.close();
      } catch {
        /* already closed */
      }
      this.channel = null;
    }
    if (this.pc) {
      this.pc.onicecandidate = null;
      this.pc.ondatachannel = null;
      this.pc.onconnectionstatechange = null;
      try {
        this.pc.close();
      } catch {
        /* already closed */
      }
      this.pc = null;
    }
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.handlers.onStatusChange(status);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  close(): void {
    this.intentionalClose = true;
    this.clearDisconnectTimer();
    this.stopHeartbeat();
    this.teardownPeer();
    this.signaling.leave(this.opts.gameId);
    this.signaling.close();
    this.setStatus("closed");
  }
}
