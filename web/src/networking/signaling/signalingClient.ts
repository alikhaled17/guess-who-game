import type { ClientToServerMessage, ServerToClientMessage, SignalData } from "./types";

/**
 * Cloudflare deployment note: the Worker must route each connection to the
 * right Durable Object (one per room) BEFORE the WebSocket is even
 * accepted, so the gameId has to travel in the URL, not just the first
 * message body — see signaling-server/src/worker.ts. Kept as a plain
 * function (not baked into the constructor) so tests can still connect
 * to a bare URL if they want to.
 */
export function buildSignalingUrl(baseUrl: string, gameId: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set("gameId", gameId);
  return url.toString();
}

export type SignalingEventHandlers = {
  onCreated?: (gameId: string) => void;
  onJoined?: (gameId: string) => void;
  onPeerJoined?: () => void;
  onPeerLeft?: () => void;
  onSignal?: (data: SignalData) => void;
  onError?: (message: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

/**
 * Thin WebSocket client for the signaling server. Its ONLY job is
 * handshake relay (see networking/signaling/types.ts) — it holds no game
 * state and makes no gameplay decisions.
 */
export class SignalingClient {
  private ws: WebSocket | null = null;
  private readonly url: string;
  private handlers: SignalingEventHandlers = {};
  private queue: ClientToServerMessage[] = [];
  private closedByUser = false;

  constructor(url: string) {
    this.url = url;
  }

  connect(handlers: SignalingEventHandlers): void {
    this.handlers = handlers;
    this.closedByUser = false;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.flushQueue();
      this.handlers.onOpen?.();
    };

    this.ws.onmessage = (event) => {
      let msg: ServerToClientMessage;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return; // ignore malformed frames
      }
      this.dispatch(msg);
    };

    this.ws.onclose = () => {
      if (!this.closedByUser) this.handlers.onClose?.();
    };

    this.ws.onerror = () => {
      // onclose will follow; nothing additional to do here.
    };
  }

  private dispatch(msg: ServerToClientMessage): void {
    switch (msg.type) {
      case "created":
        this.handlers.onCreated?.(msg.gameId);
        break;
      case "joined":
        this.handlers.onJoined?.(msg.gameId);
        break;
      case "peer-joined":
        this.handlers.onPeerJoined?.();
        break;
      case "peer-left":
        this.handlers.onPeerLeft?.();
        break;
      case "signal":
        this.handlers.onSignal?.(msg.data);
        break;
      case "error":
        this.handlers.onError?.(msg.message);
        break;
    }
  }

  private send(message: ClientToServerMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.queue.push(message);
    }
  }

  private flushQueue(): void {
    const pending = this.queue;
    this.queue = [];
    for (const m of pending) this.send(m);
  }

  createGame(gameId: string): void {
    this.send({ type: "create", gameId });
  }

  joinGame(gameId: string): void {
    this.send({ type: "join", gameId });
  }

  sendSignal(gameId: string, data: SignalData): void {
    this.send({ type: "signal", gameId, data });
  }

  leave(gameId: string): void {
    this.send({ type: "leave", gameId });
  }

  close(): void {
    this.closedByUser = true;
    this.ws?.close();
    this.ws = null;
  }
}
