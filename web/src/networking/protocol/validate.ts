/**
 * Structural validation for messages arriving off the wire. This layer only
 * checks *shape* (right fields, right types, no garbage) — it deliberately
 * knows nothing about game rules (whose turn it is, whether a character id
 * exists, etc). Semantic/rule validation happens in `game/rules`, which is
 * the single source of truth for "is this action legal right now".
 *
 * Rule #1 of networking code: never trust the remote peer. Every field is
 * checked before it touches game state.
 */
import { ALLOWED_MESSAGE_TYPES, type GameMessage } from "./messages";
import { decodeEnvelope, EnvelopeDecodeError, type NetworkMessage } from "./envelope";
import { PROTOCOL_VERSION } from "./messages";

export class MessageValidationError extends Error {}

const MAX_STRING_LENGTH = 256;

function isNonEmptyString(v: unknown, maxLen = MAX_STRING_LENGTH): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= maxLen;
}

/** Validates the *payload* shape for a known message type. Throws on failure. */
export function validateGameMessage(payload: unknown): GameMessage {
  if (typeof payload !== "object" || payload === null) {
    throw new MessageValidationError("Payload must be an object");
  }
  const p = payload as Record<string, unknown>;
  const type = p.type;

  if (typeof type !== "string" || !ALLOWED_MESSAGE_TYPES.has(type as GameMessage["type"])) {
    throw new MessageValidationError(`Unknown or missing message type: ${String(type)}`);
  }

  switch (type as GameMessage["type"]) {
    case "HELLO":
      if (!isNonEmptyString(p.name, 40)) {
        throw new MessageValidationError("HELLO requires a non-empty name (<=40 chars)");
      }
      return { type: "HELLO", name: p.name };

    case "RENAME":
      if (!isNonEmptyString(p.name, 40)) {
        throw new MessageValidationError("RENAME requires a non-empty name (<=40 chars)");
      }
      return { type: "RENAME", name: p.name };

    case "SET_DIFFICULTY": {
      const level = p.level;
      if (level !== "easy" && level !== "medium" && level !== "hard") {
        throw new MessageValidationError('SET_DIFFICULTY requires level "easy" | "medium" | "hard"');
      }
      const characterIds = p.characterIds;
      if (
        !Array.isArray(characterIds) ||
        characterIds.length === 0 ||
        characterIds.length > 40 ||
        !characterIds.every((id) => isNonEmptyString(id, 64))
      ) {
        throw new MessageValidationError("SET_DIFFICULTY requires a non-empty array of characterIds (<=40)");
      }
      return { type: "SET_DIFFICULTY", level, characterIds };
    }

    case "PLAYER_READY":
      return { type: "PLAYER_READY" };

    case "SELECT_CHARACTER":
      if (!isNonEmptyString(p.commitment, 128)) {
        throw new MessageValidationError("SELECT_CHARACTER requires a commitment hash");
      }
      return { type: "SELECT_CHARACTER", commitment: p.commitment };

    case "END_TURN":
      return { type: "END_TURN" };

    case "GUESS_CHARACTER":
      if (!isNonEmptyString(p.characterId, 64)) {
        throw new MessageValidationError("GUESS_CHARACTER requires a characterId");
      }
      return { type: "GUESS_CHARACTER", characterId: p.characterId };

    case "GUESS_RESULT":
      if (
        typeof p.correct !== "boolean" ||
        !isNonEmptyString(p.characterId, 64) ||
        !isNonEmptyString(p.salt, 128)
      ) {
        throw new MessageValidationError("GUESS_RESULT requires correct, characterId, salt");
      }
      return { type: "GUESS_RESULT", correct: p.correct, characterId: p.characterId, salt: p.salt };

    case "RESTART_GAME":
      return { type: "RESTART_GAME" };

    case "PLAYER_LEFT":
      return { type: "PLAYER_LEFT" };

    case "PING":
      return { type: "PING" };

    case "PONG":
      return { type: "PONG" };

    default: {
      const exhaustive: never = type as never;
      throw new MessageValidationError(`Unhandled message type: ${String(exhaustive)}`);
    }
  }
}

/** Fully decodes + validates a raw string received off the DataChannel. */
export function decodeAndValidate(raw: string): { envelope: NetworkMessage; message: GameMessage } {
  let envelope: NetworkMessage;
  try {
    envelope = decodeEnvelope(raw);
  } catch (err) {
    if (err instanceof EnvelopeDecodeError) {
      throw new MessageValidationError(`Invalid envelope: ${err.message}`);
    }
    throw err;
  }

  if (envelope.version !== PROTOCOL_VERSION) {
    throw new MessageValidationError(
      `Unsupported protocol version: ${envelope.version} (expected ${PROTOCOL_VERSION})`,
    );
  }

  const message = validateGameMessage(envelope.payload);
  return { envelope, message };
}
