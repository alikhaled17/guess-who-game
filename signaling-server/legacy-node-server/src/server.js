/**
 * Signaling server — the ONLY server this project has, and it does almost
 * nothing on purpose:
 *
 *   1. Pairs two browser tabs under a shared gameId ("create" / "join").
 *   2. Relays opaque WebRTC handshake payloads (SDP offer/answer, ICE
 *      candidates) between exactly those two sockets ("signal").
 *   3. Notifies each side when the other joins/leaves.
 *
 * It never sees a character, a question, an answer, a turn, or a winner —
 * once the RTCDataChannel opens, this server is no longer in the picture
 * for gameplay at all. See CLAUDE.md "Signaling vs gameplay" for the
 * rationale, and web/src/networking/signaling/types.ts for the mirrored
 * client-side message shapes (kept in sync by hand — see that file's
 * header comment for why there's no shared package).
 */
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { RoomRegistry } from "./rooms.js";

const PORT = Number(process.env.PORT) || 8080;
const MAX_MESSAGE_BYTES = 16 * 1024;

const rooms = new RoomRegistry();

const httpServer = createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", rooms: rooms.rooms.size }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server: httpServer, maxPayload: MAX_MESSAGE_BYTES });

function send(ws, message) {
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function isSignalData(data) {
  if (typeof data !== "object" || data === null) return false;
  if (data.kind === "offer" || data.kind === "answer") return typeof data.sdp === "string";
  if (data.kind === "ice-candidate") return typeof data.candidate === "object" && data.candidate !== null;
  return false;
}

wss.on("connection", (ws) => {
  ws.isAlive = true;
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return; // ignore malformed frames — never trust the wire
    }
    if (typeof msg !== "object" || msg === null || typeof msg.type !== "string") return;

    switch (msg.type) {
      case "create": {
        const result = rooms.create(msg.gameId, ws);
        if (!result.ok) {
          send(ws, { type: "error", message: result.error });
          return;
        }
        send(ws, { type: "created", gameId: msg.gameId });
        break;
      }

      case "join": {
        const result = rooms.join(msg.gameId, ws);
        if (!result.ok) {
          send(ws, { type: "error", message: result.error });
          return;
        }
        send(ws, { type: "joined", gameId: msg.gameId });
        send(result.room.host, { type: "peer-joined" });
        break;
      }

      case "signal": {
        if (!ws.gameId || !isSignalData(msg.data)) return;
        const room = rooms.get(ws.gameId);
        if (room) rooms.touch(room);
        const peer = rooms.peerOf(ws);
        send(peer, { type: "signal", data: msg.data });
        break;
      }

      case "leave": {
        if (!ws.gameId) return;
        const peer = rooms.peerOf(ws);
        rooms.release(ws);
        send(peer, { type: "peer-left" });
        break;
      }

      default:
        break; // unknown type — silently ignored
    }
  });

  ws.on("close", () => {
    if (!ws.gameId) return;
    const peer = rooms.peerOf(ws);
    rooms.release(ws);
    send(peer, { type: "peer-left" });
  });
});

// Basic dead-connection reaper (mobile devices sleep/wake and can leave
// half-open sockets behind).
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30_000);
heartbeat.unref?.();

httpServer.listen(PORT, () => {
  console.log(`[signaling] listening on :${PORT}`);
});

process.on("SIGTERM", () => {
  clearInterval(heartbeat);
  rooms.stop();
  wss.close();
  httpServer.close(() => process.exit(0));
});
