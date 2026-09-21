import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, execSync } from "node:child_process";
import { createServer } from "node:http";
import { WebSocket } from "ws";

/**
 * Integration test for the Cloudflare Worker + Durable Object signaling
 * relay (src/worker.ts, src/signalingRoom.ts) — spins up the REAL thing via
 * `wrangler dev` (which runs the actual Workers runtime, workerd, locally;
 * no mocking) against an ephemeral port, then drives it with real
 * WebSocket clients, mirroring what legacy-node-server/tests/server.test.js
 * did for the old plain-Node implementation. Slower than a unit test
 * (starting workerd takes a few seconds) but this is what actually proves
 * room pairing, signal relay, and disconnect/reconnect behavior work
 * against the real deploy target, not a mock of it.
 */

let port;
let child;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

function waitForHealth(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    (function poll() {
      fetch(url)
        .then((res) => (res.ok ? resolve() : retry()))
        .catch(retry);
      function retry() {
        if (Date.now() > deadline) return reject(new Error(`${url} never became healthy`));
        setTimeout(poll, 300);
      }
    })();
  });
}

before(async () => {
  port = await getFreePort();
  child = spawn("npx", ["wrangler", "dev", "--port", String(port)], {
    cwd: new URL("..", import.meta.url),
    shell: true,
    stdio: "ignore",
  });
  await waitForHealth(`http://127.0.0.1:${port}/health`);
});

after(() => {
  if (!child) return;
  // `wrangler dev` spawns workerd as a child process of its own; a plain
  // process.kill() on Windows leaves that orphaned. /T kills the whole
  // tree. On POSIX, killing the (shell-wrapped) pid is enough since we
  // don't detach it into its own process group.
  if (process.platform === "win32") {
    try {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
    } catch {
      /* already exited */
    }
  } else {
    child.kill("SIGKILL");
  }
});

function connect(gameId) {
  return new WebSocket(`ws://127.0.0.1:${port}?gameId=${gameId}`);
}

function once(ws, matchType, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for "${matchType}"`)), timeoutMs);
    function onMsg(raw) {
      const msg = JSON.parse(raw.toString());
      if (msg.type === matchType) {
        clearTimeout(timer);
        ws.off("message", onMsg);
        resolve(msg);
      }
    }
    ws.on("message", onMsg);
  });
}

function waitOpen(ws) {
  return new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });
}

function randomGameId() {
  return "room" + Math.random().toString(36).slice(2, 8);
}

test("host creates a room, guest joins, signals relay both directions, leave notifies the peer", async () => {
  const gameId = randomGameId();
  const host = connect(gameId);
  await waitOpen(host);
  host.send(JSON.stringify({ type: "create", gameId }));
  const created = await once(host, "created");
  assert.equal(created.gameId, gameId);

  const guest = connect(gameId);
  await waitOpen(guest);
  const hostPeerJoined = once(host, "peer-joined");
  guest.send(JSON.stringify({ type: "join", gameId }));
  const joined = await once(guest, "joined");
  assert.equal(joined.gameId, gameId);
  await hostPeerJoined;

  const guestGotSignal = once(guest, "signal");
  host.send(JSON.stringify({ type: "signal", gameId, data: { kind: "offer", sdp: "FAKE_OFFER" } }));
  const sig = await guestGotSignal;
  assert.deepEqual(sig.data, { kind: "offer", sdp: "FAKE_OFFER" });

  const hostGotSignal = once(host, "signal");
  guest.send(JSON.stringify({ type: "signal", gameId, data: { kind: "answer", sdp: "FAKE_ANSWER" } }));
  const sig2 = await hostGotSignal;
  assert.deepEqual(sig2.data, { kind: "answer", sdp: "FAKE_ANSWER" });

  const hostGotPeerLeft = once(host, "peer-left");
  guest.send(JSON.stringify({ type: "leave", gameId }));
  await hostGotPeerLeft;

  host.close();
  guest.close();
});

test("room-full and room-not-found errors", async () => {
  const gameId = randomGameId();
  const host = connect(gameId);
  await waitOpen(host);
  host.send(JSON.stringify({ type: "create", gameId }));
  await once(host, "created");

  const guest1 = connect(gameId);
  await waitOpen(guest1);
  guest1.send(JSON.stringify({ type: "join", gameId }));
  await once(guest1, "joined");

  const guest2 = connect(gameId);
  await waitOpen(guest2);
  guest2.send(JSON.stringify({ type: "join", gameId }));
  const err = await once(guest2, "error");
  assert.equal(err.message, "room-full");

  const noRoomId = randomGameId();
  const guest3 = connect(noRoomId);
  await waitOpen(guest3);
  guest3.send(JSON.stringify({ type: "join", gameId: noRoomId }));
  const err2 = await once(guest3, "error");
  assert.equal(err2.message, "room-not-found");

  host.close();
  guest1.close();
  guest2.close();
  guest3.close();
});

test("host reconnect (ungraceful disconnect) reclaims the same room", async () => {
  const gameId = randomGameId();
  const host1 = connect(gameId);
  await waitOpen(host1);
  host1.send(JSON.stringify({ type: "create", gameId }));
  await once(host1, "created");

  const guest = connect(gameId);
  await waitOpen(guest);
  const peerJoined1 = once(host1, "peer-joined");
  guest.send(JSON.stringify({ type: "join", gameId }));
  await once(guest, "joined");
  await peerJoined1;

  const guestGotPeerLeft = once(guest, "peer-left");
  host1.terminate();
  await guestGotPeerLeft;

  await new Promise((r) => setTimeout(r, 300));

  const host2 = connect(gameId);
  await waitOpen(host2);
  host2.send(JSON.stringify({ type: "create", gameId }));
  const created2 = await once(host2, "created");
  assert.equal(created2.gameId, gameId);

  host2.close();
  guest.close();
});

test("invalid gameId is rejected at the HTTP upgrade layer", async () => {
  const ws = connect("bad id with spaces");
  await new Promise((resolve) => {
    ws.once("close", resolve);
    ws.once("error", resolve);
    ws.once("open", () => {
      ws.close();
      assert.fail("connection should not have opened for an invalid gameId");
    });
  });
});
