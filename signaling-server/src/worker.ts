/**
 * Entry point: a stateless router in front of one SignalingRoom Durable
 * Object per game room. Knows almost nothing — its only job is picking
 * which room a connection belongs to (via the gameId query param, added by
 * the client — see web/src/networking/signaling/signalingClient.ts's
 * buildSignalingUrl) and handing the raw request off to that room's Durable
 * Object, which does the actual pairing/relay (see signalingRoom.ts).
 */
import { isValidGameId } from "./types";
import { SignalingRoom } from "./signalingRoom";

export interface Env {
  ROOMS: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get("Upgrade") !== "websocket") {
      // Not a WebRTC-handshake connection at all — just the plain HTTP
      // health check (used by uptime monitors, or a human checking the
      // deploy worked).
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { "content-type": "application/json" },
      });
    }

    const gameId = url.searchParams.get("gameId");
    if (!isValidGameId(gameId)) {
      return new Response("invalid or missing gameId", { status: 400 });
    }

    const id = env.ROOMS.idFromName(gameId);
    const stub = env.ROOMS.get(id);
    return stub.fetch(request);
  },
};

export { SignalingRoom };
