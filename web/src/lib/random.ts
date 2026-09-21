/**
 * Small randomness helpers, isolated here so the game engine never needs
 * to import a browser API directly (see game/engine/engine.ts).
 */

const GAME_ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no ambiguous chars (0/o, 1/l/i)

function randomBytes(length: number): Uint8Array {
  const arr = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < length; i += 1) arr[i] = Math.floor(Math.random() * 256);
  }
  return arr;
}

/** Short, URL-safe, human-typo-resistant id for the shareable game link. */
export function generateGameId(length = 8): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += GAME_ID_ALPHABET[bytes[i] % GAME_ID_ALPHABET.length];
  }
  return out;
}

/** Random salt used in the character-selection commit-reveal scheme. */
export function generateSalt(): string {
  const bytes = randomBytes(16);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
