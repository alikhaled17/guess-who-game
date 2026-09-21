/**
 * Commit-reveal scheme for secret character selection.
 *
 * When a player picks a secret character, their characterId is NEVER sent
 * to the opponent — only `hashCommitment(characterId, salt)`. At the end of
 * the game the real characterId + salt are revealed, and the opponent can
 * call `verifyCommitment` to confirm the reveal matches what was committed
 * at selection time (i.e. the player didn't switch secrets mid-game).
 *
 * This is intentionally a plain, synchronous, dependency-free hash (FNV-1a)
 * rather than Web Crypto's async `crypto.subtle.digest`. Two reasons:
 *  1. The game engine must stay pure and testable without any browser API
 *     (see CLAUDE.md "Game Engine is browser-free"). An async hash would
 *     force the whole reducer chain to become async.
 *  2. This is tamper-evidence for a casual, same-room, trusted-opponent
 *     game — not a cryptographic security boundary. It stops accidental
 *     desyncs and casual snooping in devtools, not a determined attacker.
 */

export function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // Unsigned 32-bit hex, zero-padded.
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function hashCommitment(characterId: string, salt: string): string {
  return fnv1aHex(`${characterId}:${salt}`);
}

export function verifyCommitment(commitment: string, characterId: string, salt: string): boolean {
  return hashCommitment(characterId, salt) === commitment;
}
