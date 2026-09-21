import type { GameMessage } from "./messages";
import { PROTOCOL_VERSION } from "./messages";

/** Maximum serialized message size we will ever send or accept, in bytes. */
export const MAX_MESSAGE_BYTES = 8 * 1024; // 8 KiB — gameplay events are tiny.

/** Envelope wrapping every GameMessage sent over the DataChannel. */
export interface NetworkMessage {
  /** Unique id for this message (used for de-duplication / debugging). */
  id: string;
  /** Protocol version the sender is speaking. */
  version: number;
  /** Monotonically increasing per-sender sequence number. */
  seq: number;
  /** Unix ms timestamp the message was created. */
  ts: number;
  /** The actual game event. */
  payload: GameMessage;
}

let localMessageCounter = 0;

function generateId(): string {
  localMessageCounter += 1;
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${localMessageCounter}-${random}`;
}

export function createEnvelope(payload: GameMessage, seq: number): NetworkMessage {
  return {
    id: generateId(),
    version: PROTOCOL_VERSION,
    seq,
    ts: Date.now(),
    payload,
  };
}

export function encodeEnvelope(message: NetworkMessage): string {
  return JSON.stringify(message);
}

/** Errors thrown while parsing raw bytes off the wire. Always caught by the caller. */
export class EnvelopeDecodeError extends Error {}

export function decodeEnvelope(raw: string): NetworkMessage {
  if (typeof raw !== "string") {
    throw new EnvelopeDecodeError("Envelope must be a string");
  }
  if (raw.length > MAX_MESSAGE_BYTES) {
    throw new EnvelopeDecodeError(`Envelope exceeds max size (${raw.length} bytes)`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new EnvelopeDecodeError("Envelope is not valid JSON");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new EnvelopeDecodeError("Envelope must be an object");
  }

  const candidate = parsed as Partial<NetworkMessage>;
  if (typeof candidate.id !== "string" || candidate.id.length === 0) {
    throw new EnvelopeDecodeError("Missing envelope id");
  }
  if (typeof candidate.version !== "number") {
    throw new EnvelopeDecodeError("Missing envelope version");
  }
  if (typeof candidate.seq !== "number") {
    throw new EnvelopeDecodeError("Missing envelope seq");
  }
  if (typeof candidate.ts !== "number") {
    throw new EnvelopeDecodeError("Missing envelope timestamp");
  }
  if (typeof candidate.payload !== "object" || candidate.payload === null) {
    throw new EnvelopeDecodeError("Missing envelope payload");
  }

  return candidate as NetworkMessage;
}
