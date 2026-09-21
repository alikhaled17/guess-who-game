/**
 * One Durable Object instance == one game room (routed deterministically by
 * gameId via idFromName — see worker.ts). Pairs exactly two sockets (host +
 * guest) and relays opaque WebRTC handshake payloads between them, plus
 * peer-joined/peer-left notifications. Never sees a character, question,
 * answer, turn, or winner — see CLAUDE.md "Signaling vs gameplay".
 *
 * Uses the WebSocket Hibernation API (acceptWebSocket/getWebSockets +
 * serializeAttachment) rather than the classic ws.accept(), so an idle room
 * costs nothing while both peers are just sitting in a lobby or mid-game —
 * the Worker can be fully evicted from memory between messages and Cloudflare
 * wakes it back up on the next one, restoring session state from each
 * socket's attachment. There is deliberately NO other persisted state (no
 * `ctx.storage` writes): once both sockets are gone, this room forgets
 * everything, which is exactly the ephemeral, no-database behavior this
 * project wants.
 */
import { parseClientMessage, type ServerToClientMessage, type SessionAttachment } from "./types";

// Mirrors the old Node server's MAX_MESSAGE_BYTES guard.
const MAX_MESSAGE_BYTES = 16 * 1024;

export class SignalingRoom implements DurableObject {
  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: unknown,
  ) {
    // Free, automatic heartbeat: Cloudflare answers "ping" with "pong"
    // directly, without ever waking this Durable Object up. Mirrors the old
    // server's setInterval(ping) reaper, but at zero compute cost.
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string): Promise<void> {
    if (typeof message !== "string" || message.length > MAX_MESSAGE_BYTES) return;
    const msg = parseClientMessage(message);
    if (!msg) return; // malformed frame — never trust the wire

    switch (msg.type) {
      case "create": {
        const existingHost = this.findByRole("host", ws);
        if (existingHost) {
          this.send(ws, { type: "error", message: "room-already-exists" });
          return;
        }
        ws.serializeAttachment({ role: "host" } satisfies SessionAttachment);
        this.send(ws, { type: "created", gameId: msg.gameId });
        break;
      }

      case "join": {
        const existingGuest = this.findByRole("guest", ws);
        if (existingGuest) {
          this.send(ws, { type: "error", message: "room-full" });
          return;
        }
        const host = this.findByRole("host");
        if (!host) {
          this.send(ws, { type: "error", message: "room-not-found" });
          return;
        }
        ws.serializeAttachment({ role: "guest" } satisfies SessionAttachment);
        this.send(ws, { type: "joined", gameId: msg.gameId });
        this.send(host, { type: "peer-joined" });
        break;
      }

      case "signal": {
        const peer = this.peerOf(ws);
        if (peer) this.send(peer, { type: "signal", data: msg.data });
        break;
      }

      case "leave": {
        const peer = this.peerOf(ws);
        if (peer) this.send(peer, { type: "peer-left" });
        try {
          ws.close(1000, "left");
        } catch {
          /* already closing */
        }
        break;
      }
    }
  }

  async webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): Promise<void> {
    const peer = this.peerOf(ws);
    if (peer) this.send(peer, { type: "peer-left" });
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    const peer = this.peerOf(ws);
    if (peer) this.send(peer, { type: "peer-left" });
  }

  /** The socket (if any, and if live) currently holding `role` in this room, optionally excluding one socket from the search. */
  private findByRole(role: SessionAttachment["role"], exclude?: WebSocket): WebSocket | null {
    for (const s of this.ctx.getWebSockets()) {
      if (s === exclude) continue;
      const attachment = s.deserializeAttachment() as SessionAttachment | null;
      if (attachment?.role === role) return s;
    }
    return null;
  }

  /** The OTHER party's socket for whichever role `ws` holds — host<->guest. */
  private peerOf(ws: WebSocket): WebSocket | null {
    const mine = ws.deserializeAttachment() as SessionAttachment | null;
    if (!mine) return null;
    const otherRole: SessionAttachment["role"] = mine.role === "host" ? "guest" : "host";
    return this.findByRole(otherRole);
  }

  private send(ws: WebSocket, message: ServerToClientMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      /* socket closed between lookup and send — nothing to do */
    }
  }
}
