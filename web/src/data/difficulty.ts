import type { Character, DifficultyLevel } from "@/game/types";
import { CHARACTERS, getCharacterById } from "./characters";

export const DIFFICULTY_LEVELS: DifficultyLevel[] = ["easy", "medium", "hard"];

// Difficulty display labels live in lib/i18n/translations.ts (t("difficulty.easy") etc.)
// so they follow the player's chosen language, not a single hardcoded one.

const DIFFICULTY_COUNTS: Record<DifficultyLevel, number> = {
  easy: 15,
  medium: 20,
  hard: 30,
};

export function characterCountForDifficulty(level: DifficultyLevel): number {
  return Math.min(DIFFICULTY_COUNTS[level], CHARACTERS.length);
}

/**
 * Randomly draws N unique character ids from the full roster (N = the
 * count for `level`) so the board looks different game to game, even at
 * the same difficulty. This is called from the HOOK layer (see
 * `hooks/useGameSession.ts`), never from inside `game/engine` — the engine
 * must stay pure and deterministic (rule #1 in CLAUDE.md), so randomness
 * always happens one layer up, exactly like salt generation for character
 * selection (`lib/random.ts`'s `generateSalt`).
 *
 * Only the HOST calls this. The resulting id list is sent to the guest
 * over the DataChannel (see `SET_DIFFICULTY` in
 * `networking/protocol/messages.ts`) so both peers end up with the
 * IDENTICAL board — nobody re-derives it independently, because there's no
 * shared seed to derive it from deterministically.
 */
export function pickRandomCharacterIds(level: DifficultyLevel): string[] {
  const count = characterCountForDifficulty(level);
  const pool = [...CHARACTERS];
  // Fisher-Yates shuffle, then take the first `count`.
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).map((c) => c.id);
}

/** Resolves ids to Characters, dropping any id that doesn't exist in the roster. */
export function getCharactersByIds(ids: string[]): Character[] {
  const characters: Character[] = [];
  for (const id of ids) {
    const character = getCharacterById(id);
    if (character) characters.push(character);
  }
  return characters;
}
