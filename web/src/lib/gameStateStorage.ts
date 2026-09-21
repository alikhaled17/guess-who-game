import type { GameState, PlayerId } from "@/game/types";

/**
 * Survives a page refresh. `GameState` otherwise lives only in React memory
 * — reloading the tab used to silently drop the player back to the very
 * first screen even though their room/connection was still live, because a
 * fresh mount always started from `createInitialState`'s "idle" status.
 *
 * This does NOT restore the WebRTC connection itself (that's tied to
 * browser-runtime objects that can't survive a reload and always
 * re-handshakes from scratch via `ConnectionManager` — see
 * `hooks/useGameSession.ts`). It only restores the GAME progress
 * (difficulty, selections, whose turn, etc.), so that once the connection
 * comes back up, both peers' states still agree instead of one side
 * silently resetting to square one.
 *
 * Scoped to `sessionStorage` (not `localStorage`) on purpose: it should
 * survive a reload of the same tab, but a genuinely new tab/session
 * starting the same gameId fresh is the expected behavior, not a bug.
 */
const KEY_PREFIX = "guesswho:state:";

function storageKey(gameId: string, role: PlayerId): string {
  return `${KEY_PREFIX}${gameId}:${role}`;
}

/** Cheap structural check — enough to catch corruption or a shape change from an older app version. */
function looksLikeGameState(value: unknown, gameId: string, role: PlayerId): value is GameState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.gameId === gameId &&
    v.localPlayerId === role &&
    typeof v.status === "string" &&
    Array.isArray(v.characters) &&
    typeof v.players === "object" &&
    v.players !== null
  );
}

export function saveGameStateSnapshot(gameId: string, role: PlayerId, state: GameState): void {
  try {
    window.sessionStorage.setItem(storageKey(gameId, role), JSON.stringify(state));
  } catch {
    /* sessionStorage unavailable/full — non-fatal, refresh just won't resume this time */
  }
}

export function loadGameStateSnapshot(gameId: string, role: PlayerId): GameState | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey(gameId, role));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return looksLikeGameState(parsed, gameId, role) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearGameStateSnapshot(gameId: string, role: PlayerId): void {
  try {
    window.sessionStorage.removeItem(storageKey(gameId, role));
  } catch {
    /* non-fatal */
  }
}
