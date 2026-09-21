/**
 * In-memory room registry. A "room" pairs exactly two sockets — host and
 * guest — under a shared gameId. No database: rooms are ephemeral and
 * live only as long as the process does, which is all a same-Wi-Fi,
 * no-account game needs.
 *
 * A room is kept alive for ROOM_TTL_MS of inactivity after the last
 * message, even if one side's socket drops, so a brief Wi-Fi blip lets
 * that player reconnect and reclaim their slot with the same gameId
 * instead of losing the game (see ConnectionManager.hardReconnect on the
 * client, and CLAUDE.md's networking section).
 */

const ROOM_TTL_MS = 10 * 60 * 1000; // 10 minutes of total inactivity
const SWEEP_INTERVAL_MS = 30 * 1000;
const GAME_ID_PATTERN = /^[a-z0-9]{4,32}$/i;

/** @typedef {{ host: import('ws').WebSocket | null, guest: import('ws').WebSocket | null, lastActivityAt: number }} Room */

export class RoomRegistry {
  constructor() {
    /** @type {Map<string, Room>} */
    this.rooms = new Map();
    this.sweepTimer = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS);
    this.sweepTimer.unref?.();
  }

  isValidGameId(gameId) {
    return typeof gameId === "string" && GAME_ID_PATTERN.test(gameId);
  }

  touch(room) {
    room.lastActivityAt = Date.now();
  }

  /** @returns {{ok:true, room:Room}|{ok:false,error:string}} */
  create(gameId, ws) {
    if (!this.isValidGameId(gameId)) return { ok: false, error: "invalid-game-id" };
    let room = this.rooms.get(gameId);
    if (room && room.host && room.host.readyState === room.host.OPEN && room.host !== ws) {
      return { ok: false, error: "room-already-exists" };
    }
    if (!room) {
      room = { host: null, guest: null, lastActivityAt: Date.now() };
      this.rooms.set(gameId, room);
    }
    room.host = ws;
    this.touch(room);
    ws.gameId = gameId;
    ws.role = "host";
    return { ok: true, room };
  }

  /** @returns {{ok:true, room:Room}|{ok:false,error:string}} */
  join(gameId, ws) {
    if (!this.isValidGameId(gameId)) return { ok: false, error: "invalid-game-id" };
    const room = this.rooms.get(gameId);
    if (!room) return { ok: false, error: "room-not-found" };
    if (room.guest && room.guest.readyState === room.guest.OPEN && room.guest !== ws) {
      return { ok: false, error: "room-full" };
    }
    room.guest = ws;
    this.touch(room);
    ws.gameId = gameId;
    ws.role = "guest";
    return { ok: true, room };
  }

  get(gameId) {
    return this.rooms.get(gameId) ?? null;
  }

  /** The other party's socket for whichever role `ws` holds in its room. */
  peerOf(ws) {
    const room = this.rooms.get(ws.gameId);
    if (!room) return null;
    return ws.role === "host" ? room.guest : room.host;
  }

  /** Clears this socket's slot (on explicit leave or disconnect) without deleting the room. */
  release(ws) {
    const room = this.rooms.get(ws.gameId);
    if (!room) return;
    if (ws.role === "host" && room.host === ws) room.host = null;
    if (ws.role === "guest" && room.guest === ws) room.guest = null;
    this.touch(room);
  }

  sweep() {
    const now = Date.now();
    for (const [gameId, room] of this.rooms) {
      const hostAlive = room.host && room.host.readyState === room.host.OPEN;
      const guestAlive = room.guest && room.guest.readyState === room.guest.OPEN;
      const expired = now - room.lastActivityAt > ROOM_TTL_MS;
      if ((!hostAlive && !guestAlive) || expired) {
        this.rooms.delete(gameId);
      }
    }
  }

  stop() {
    clearInterval(this.sweepTimer);
  }
}
