/**
 * Signaling protocol — hand-mirrored from
 * web/src/networking/signaling/types.ts (no shared package between the two
 * deployables on purpose — see that file's header comment). Keep these two
 * files in sync by hand whenever the protocol changes.
 */

export type SignalData =
  | { kind: "offer"; sdp: string }
  | { kind: "answer"; sdp: string }
  | { kind: "ice-candidate"; candidate: unknown }
  | { kind: string; [key: string]: unknown };

export type ClientToServerMessage =
  | { type: "create"; gameId: string }
  | { type: "join"; gameId: string }
  | { type: "signal"; gameId: string; data: SignalData }
  | { type: "leave"; gameId: string };

export type ServerToClientMessage =
  | { type: "created"; gameId: string }
  | { type: "joined"; gameId: string }
  | { type: "peer-joined" }
  | { type: "peer-left" }
  | { type: "signal"; data: SignalData }
  | { type: "error"; message: string };

export const GAME_ID_PATTERN = /^[a-z0-9]{4,32}$/i;

export function isValidGameId(gameId: unknown): gameId is string {
  return typeof gameId === "string" && GAME_ID_PATTERN.test(gameId);
}

function isSignalData(data: unknown): data is SignalData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  if (d.kind === "offer" || d.kind === "answer") return typeof d.sdp === "string";
  if (d.kind === "ice-candidate") return typeof d.candidate === "object" && d.candidate !== null;
  return false;
}

/** Structural validation only — never trust the wire. Same rule this project applies everywhere else (see game/rules/validate.ts on the client). */
export function parseClientMessage(raw: string): ClientToServerMessage | null {
  let msg: unknown;
  try {
    msg = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof msg !== "object" || msg === null) return null;
  const m = msg as Record<string, unknown>;
  switch (m.type) {
    case "create":
    case "join":
    case "leave":
      return isValidGameId(m.gameId) ? ({ type: m.type, gameId: m.gameId } as ClientToServerMessage) : null;
    case "signal":
      return isValidGameId(m.gameId) && isSignalData(m.data)
        ? { type: "signal", gameId: m.gameId, data: m.data as SignalData }
        : null;
    default:
      return null;
  }
}

/** Everything this Durable Object remembers about one connected socket, persisted via serializeAttachment so it survives hibernation. */
export interface SessionAttachment {
  role: "host" | "guest";
}
