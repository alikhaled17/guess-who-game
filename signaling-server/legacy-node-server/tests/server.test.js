import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { RoomRegistry } from "../src/rooms.js";

/**
 * These tests spin up the same handler logic as src/server.js against an
 * ephemeral port, using real WebSocket clients — this is an integration
 * test of the signaling relay, not a unit test of game rules (those live
 * in web/tests and run against the pure, browser-free game engine).
 */

function startTestServer() {
  const rooms = new RoomRegistry();
  const httpServer = createServer();
  const wss = new WebSocketServer({ server: httpServer });

  function send(ws, message) {
    if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
  }

  wss.on("connection", (ws) => {
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "create") {
        const result = rooms.create(msg.gameId, ws);
        if (!result.ok) return send(ws, { type: "error", message: result.error });
        send(ws, { type: "created", gameId: msg.gameId });
      } else if (msg.type === "join") {
        const result = rooms.join(msg.gameId, ws);
        if (!result.ok) return send(ws, { type: "error", message: result.error });
        send(ws, { type: "joined", gameId: msg.gameId });
        send(result.room.host, { type: "peer-joined" });
      } else if (msg.type === "signal") {
        send(rooms.peerOf(ws), { type: "signal", data: msg.data });
      } else if (msg.type === "leave") {
        const peer = rooms.peerOf(ws);
        rooms.release(ws);
        send(peer, { type: "peer-left" });
      }
    });
    ws.on("close", () => {
      if (!ws.gameId) return;
      const peer = rooms.peerOf(ws);
      rooms.release(ws);
      send(peer, { type: "peer-left" });
    });
  });

  return new Promise((resolve) => {
    httpServer.listen(0, () => {
      const port = httpServer.address().port;
      resolve({
        url: `ws://localhost:${port}`,
        close: () => new Promise((r) => { rooms.stop(); wss.close(); httpServer.close(r); }),
      });
    });
  });
}

function onceMessage(ws) {
  return new Promise((resolve) => ws.once("message", (raw) => resolve(JSON.parse(raw.toString()))));
}

function onceOpen(ws) {
  return new Promise((resolve) => ws.once("open", resolve));
}

test("host creates a room and guest joins it, both get notified", async () => {
  const server = await startTestServer();
  try {
    const host = new WebSocket(server.url);
    await onceOpen(host);
    host.send(JSON.stringify({ type: "create", gameId: "abcd1234" }));
    const created = await onceMessage(host);
    assert.equal(created.type, "created");

    const guest = new WebSocket(server.url);
    await onceOpen(guest);
    const hostNotified = onceMessage(host); // peer-joined
    guest.send(JSON.stringify({ type: "join", gameId: "abcd1234" }));
    const joined = await onceMessage(guest);
    assert.equal(joined.type, "joined");
    const peerJoined = await hostNotified;
    assert.equal(peerJoined.type, "peer-joined");

    host.close();
    guest.close();
  } finally {
    await server.close();
  }
});

test("relays opaque signal payloads between host and guest only", async () => {
  const server = await startTestServer();
  try {
    const host = new WebSocket(server.url);
    await onceOpen(host);
    host.send(JSON.stringify({ type: "create", gameId: "relay001" }));
    await onceMessage(host);

    const guest = new WebSocket(server.url);
    await onceOpen(guest);
    const hostGotPeerJoined = onceMessage(host);
    guest.send(JSON.stringify({ type: "join", gameId: "relay001" }));
    await onceMessage(guest);
    await hostGotPeerJoined;

    const guestGotSignal = onceMessage(guest);
    host.send(JSON.stringify({ type: "signal", gameId: "relay001", data: { kind: "offer", sdp: "v=0..." } }));
    const relayed = await guestGotSignal;
    assert.deepEqual(relayed, { type: "signal", data: { kind: "offer", sdp: "v=0..." } });

    host.close();
    guest.close();
  } finally {
    await server.close();
  }
});

test("rejects joining a room that does not exist", async () => {
  const server = await startTestServer();
  try {
    const guest = new WebSocket(server.url);
    await onceOpen(guest);
    guest.send(JSON.stringify({ type: "join", gameId: "doesnotexist" }));
    const reply = await onceMessage(guest);
    assert.equal(reply.type, "error");
    assert.equal(reply.message, "room-not-found");
    guest.close();
  } finally {
    await server.close();
  }
});

test("rejects a third device joining an already-full room", async () => {
  const server = await startTestServer();
  try {
    const host = new WebSocket(server.url);
    await onceOpen(host);
    host.send(JSON.stringify({ type: "create", gameId: "fullroom1" }));
    await onceMessage(host);

    const guest1 = new WebSocket(server.url);
    await onceOpen(guest1);
    const hostPeerJoined = onceMessage(host);
    guest1.send(JSON.stringify({ type: "join", gameId: "fullroom1" }));
    await onceMessage(guest1);
    await hostPeerJoined;

    const guest2 = new WebSocket(server.url);
    await onceOpen(guest2);
    guest2.send(JSON.stringify({ type: "join", gameId: "fullroom1" }));
    const reply = await onceMessage(guest2);
    assert.equal(reply.type, "error");
    assert.equal(reply.message, "room-full");

    host.close();
    guest1.close();
    guest2.close();
  } finally {
    await server.close();
  }
});

test("notifies the remaining peer when the other side disconnects", async () => {
  const server = await startTestServer();
  try {
    const host = new WebSocket(server.url);
    await onceOpen(host);
    host.send(JSON.stringify({ type: "create", gameId: "leave0001" }));
    await onceMessage(host);

    const guest = new WebSocket(server.url);
    await onceOpen(guest);
    const hostPeerJoined = onceMessage(host);
    guest.send(JSON.stringify({ type: "join", gameId: "leave0001" }));
    await onceMessage(guest);
    await hostPeerJoined;

    const hostGotPeerLeft = onceMessage(host);
    guest.close();
    const peerLeft = await hostGotPeerLeft;
    assert.equal(peerLeft.type, "peer-left");

    host.close();
  } finally {
    await server.close();
  }
});
