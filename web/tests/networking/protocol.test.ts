import { createEnvelope, encodeEnvelope, decodeEnvelope, EnvelopeDecodeError, MAX_MESSAGE_BYTES } from "@/networking/protocol/envelope";
import { decodeAndValidate, validateGameMessage, MessageValidationError } from "@/networking/protocol/validate";
import { hashCommitment, verifyCommitment, fnv1aHex } from "@/game/rules/commitment";

describe("Envelope encode/decode", () => {
  it("round-trips a valid message", () => {
    const env = createEnvelope({ type: "PLAYER_READY" }, 1);
    const decoded = decodeEnvelope(encodeEnvelope(env));
    expect(decoded).toEqual(env);
  });

  it("rejects non-JSON input", () => {
    expect(() => decodeEnvelope("not json{{{")).toThrow(EnvelopeDecodeError);
  });

  it("rejects an oversized payload", () => {
    const huge = "x".repeat(MAX_MESSAGE_BYTES + 1);
    expect(() => decodeEnvelope(huge)).toThrow(EnvelopeDecodeError);
  });

  it("rejects an envelope missing required fields", () => {
    expect(() => decodeEnvelope(JSON.stringify({ payload: { type: "PLAYER_READY" } }))).toThrow(
      EnvelopeDecodeError,
    );
  });
});

describe("Message validation — never trust the remote peer", () => {
  it("accepts every known message type with correct shape", () => {
    expect(validateGameMessage({ type: "HELLO", name: "Ali" })).toEqual({ type: "HELLO", name: "Ali" });
    expect(validateGameMessage({ type: "RENAME", name: "Ali" })).toEqual({ type: "RENAME", name: "Ali" });
    expect(validateGameMessage({ type: "SET_DIFFICULTY", level: "easy", characterIds: ["a", "b"] })).toEqual({
      type: "SET_DIFFICULTY",
      level: "easy",
      characterIds: ["a", "b"],
    });
    expect(validateGameMessage({ type: "PLAYER_READY" })).toEqual({ type: "PLAYER_READY" });
    expect(validateGameMessage({ type: "SELECT_CHARACTER", commitment: "abc" })).toEqual({
      type: "SELECT_CHARACTER",
      commitment: "abc",
    });
    expect(validateGameMessage({ type: "END_TURN" })).toBeTruthy();
    expect(validateGameMessage({ type: "GUESS_CHARACTER", characterId: "karim" })).toBeTruthy();
    expect(
      validateGameMessage({ type: "GUESS_RESULT", correct: true, characterId: "karim", salt: "abc" }),
    ).toBeTruthy();
    expect(validateGameMessage({ type: "RESTART_GAME" })).toBeTruthy();
    expect(validateGameMessage({ type: "PLAYER_LEFT" })).toBeTruthy();
    expect(validateGameMessage({ type: "PING" })).toBeTruthy();
    expect(validateGameMessage({ type: "PONG" })).toBeTruthy();
  });

  it("rejects an unknown message type", () => {
    expect(() => validateGameMessage({ type: "DELETE_OPPONENT_STATE" })).toThrow(MessageValidationError);
  });

  it("rejects malformed payloads (wrong field types)", () => {
    expect(() => validateGameMessage({ type: "HELLO", name: 12345 })).toThrow(MessageValidationError);
    expect(() => validateGameMessage({ type: "SELECT_CHARACTER" })).toThrow(MessageValidationError);
    expect(() => validateGameMessage({ type: "SET_DIFFICULTY", level: "impossible" })).toThrow(
      MessageValidationError,
    );
    expect(() => validateGameMessage({ type: "SET_DIFFICULTY" })).toThrow(MessageValidationError);
  });

  it("rejects a non-object payload", () => {
    expect(() => validateGameMessage("PLAYER_READY")).toThrow(MessageValidationError);
    expect(() => validateGameMessage(null)).toThrow(MessageValidationError);
  });

  it("rejects an overly long HELLO name (basic DoS/garbage guard)", () => {
    expect(() => validateGameMessage({ type: "HELLO", name: "x".repeat(1000) })).toThrow(MessageValidationError);
  });

  it("decodeAndValidate rejects a mismatched protocol version", () => {
    const env = createEnvelope({ type: "PING" }, 1);
    const tampered = encodeEnvelope({ ...env, version: 999 });
    expect(() => decodeAndValidate(tampered)).toThrow(MessageValidationError);
  });

  it("decodeAndValidate accepts a well-formed envelope end to end", () => {
    const env = createEnvelope({ type: "GUESS_CHARACTER", characterId: "karim" }, 5);
    const { message } = decodeAndValidate(encodeEnvelope(env));
    expect(message).toEqual({ type: "GUESS_CHARACTER", characterId: "karim" });
  });
});

describe("Commitment scheme (character selection secrecy)", () => {
  it("is deterministic for the same input", () => {
    expect(hashCommitment("karim", "salt1")).toBe(hashCommitment("karim", "salt1"));
  });

  it("differs for different characters or salts", () => {
    expect(hashCommitment("karim", "salt1")).not.toBe(hashCommitment("sara", "salt1"));
    expect(hashCommitment("karim", "salt1")).not.toBe(hashCommitment("karim", "salt2"));
  });

  it("verifyCommitment confirms a correct reveal and rejects a tampered one", () => {
    const commitment = hashCommitment("karim", "salt1");
    expect(verifyCommitment(commitment, "karim", "salt1")).toBe(true);
    expect(verifyCommitment(commitment, "sara", "salt1")).toBe(false);
    expect(verifyCommitment(commitment, "karim", "wrong-salt")).toBe(false);
  });

  it("fnv1aHex always returns an 8-character hex string", () => {
    expect(fnv1aHex("anything")).toMatch(/^[0-9a-f]{8}$/);
    expect(fnv1aHex("")).toMatch(/^[0-9a-f]{8}$/);
  });
});
