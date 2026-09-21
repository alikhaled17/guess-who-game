import type { DifficultyLevel, GameState, Player, PlayerId } from "@/game/types";
import { otherPlayer } from "@/game/types";

export const DEFAULT_DIFFICULTY: DifficultyLevel = "medium";

export interface CreateInitialStateParams {
  gameId: string;
  localPlayerId: PlayerId;
  localName: string;
}

function makePlayer(id: PlayerId, name: string): Player {
  return {
    id,
    name,
    role: id,
    connected: id === "host" ? true : false, // placeholder; corrected below for local player
    ready: false,
    hasSelectedCharacter: false,
  };
}

export function createInitialState(params: CreateInitialStateParams): GameState {
  const { gameId, localPlayerId, localName } = params;
  const remoteId = otherPlayer(localPlayerId);

  const localPlayer = makePlayer(localPlayerId, localName);
  localPlayer.connected = true; // the local player is always "connected" to themselves

  const remotePlayer = makePlayer(remoteId, "");
  remotePlayer.connected = false; // becomes true once HELLO is received

  return {
    gameId,
    status: "idle",
    localPlayerId,
    players: {
      [localPlayerId]: localPlayer,
      [remoteId]: remotePlayer,
    } as Record<PlayerId, Player>,
    currentTurn: "host", // fixed convention: host always takes the first turn
    difficulty: DEFAULT_DIFFICULTY,
    /**
     * Starts empty — unlike most of this app's state, the character pool
     * is a RANDOM draw (see `data/difficulty.ts`'s `pickRandomCharacterIds`)
     * and two independently-run `Math.random()` calls on two machines will
     * never agree. So there is no deterministic default to compute here;
     * the real pool always arrives via an explicit `SET_DIFFICULTY`
     * message that the host sends immediately upon connecting (see
     * `hooks/useGameSession.ts`), which both sides then apply identically.
     */
    characters: [],
    eliminatedByLocalPlayer: [],
    pendingGuess: null,
    winner: null,
    gameOverReason: null,
    reveals: [],
    nextSeq: 1,
    localSecret: null,
    remoteCommitment: null,
  };
}
