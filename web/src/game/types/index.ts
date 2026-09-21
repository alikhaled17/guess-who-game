/**
 * Core domain types for the game. These types are pure data — no browser APIs,
 * no React, no networking. This keeps the game engine 100% unit-testable
 * (see /web/tests/game) and keeps UI/networking concerns from leaking in.
 */

/** A stable identifier for a player, unique within a single game session. */
export type PlayerId = "host" | "guest";

export type PlayerRole = "host" | "guest";

export interface Player {
  id: PlayerId;
  name: string;
  role: PlayerRole;
  connected: boolean;
  ready: boolean;
  /** True once this player has committed to a secret character. */
  hasSelectedCharacter: boolean;
}

export interface Character {
  id: string;
  name: string;
  /** Path to a static portrait asset under /public (e.g. "/characters/khalid.webp"). */
  image: string;
}

/**
 * How many characters are in play. Chosen by the host during the lobby
 * (see `game/rules/validation.ts`'s `canSetDifficulty`). The full roster is
 * large (see `data/characters.ts`) specifically so a random draw of this
 * size looks different game to game — see `data/difficulty.ts`'s
 * `pickRandomCharacterIds` and CLAUDE.md "Randomized character pool".
 */
export type DifficultyLevel = "easy" | "medium" | "hard";

export type GameStatus =
  | "idle" // engine created, nobody connected yet
  | "lobby" // peer connected, waiting for both to be "ready"
  | "selecting" // both ready, choosing secret characters
  | "playing" // turns in progress
  | "finished"; // a winner has been decided

export interface PendingGuess {
  characterId: string;
  guessedBy: PlayerId;
}

export type GameOverReason = "correct-guess" | "wrong-guess" | "opponent-left";

export interface Reveal {
  playerId: PlayerId;
  characterId: string;
}

export interface GameState {
  gameId: string;
  status: GameStatus;
  localPlayerId: PlayerId;
  players: Record<PlayerId, Player>;
  currentTurn: PlayerId;
  /** Chosen by the host during the lobby; both peers derive `characters` from this identically. */
  difficulty: DifficultyLevel;
  /** The shared character pool both players pick from and ask about, derived from `difficulty`. */
  characters: Character[];
  /** Characters the LOCAL player has crossed off their own board. Never synced. */
  eliminatedByLocalPlayer: string[];
  /**
   * Non-null exactly while a final guess is in flight and awaiting the
   * defender's verified confirm/deny. This doubles as the "special phase"
   * flag — there's no separate `turnPhase` enum, because with Q&A verbal
   * (not networked, see CLAUDE.md) the only phase distinction that matters
   * for gating actions is "normal turn" vs. "a guess is being resolved".
   */
  pendingGuess: PendingGuess | null;
  winner: PlayerId | null;
  gameOverReason: GameOverReason | null;
  reveals: Reveal[];
  /** Monotonically increasing sequence number for the next outgoing action. */
  nextSeq: number;
  /**
   * The local player's secret pick + salt. Kept inside GameState for
   * convenience (single source of truth to snapshot/debug) but NEVER
   * read by the networking layer when building outgoing messages except
   * at the explicit, deliberate reveal step in the guess flow.
   */
  localSecret: { characterId: string; salt: string } | null;
  /** The commitment hash the remote player published when they selected. */
  remoteCommitment: string | null;
}

export function otherPlayer(id: PlayerId): PlayerId {
  return id === "host" ? "guest" : "host";
}
