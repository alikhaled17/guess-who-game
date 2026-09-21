/**
 * The Game Engine: a pure, synchronous, browser-free reducer.
 *
 *   UI action  ---> applyLocalAction  ---> { state, outgoing[] }
 *   Remote msg ---> applyRemoteMessage ---> { state, outgoing[] }
 *
 * Nothing in this file touches WebRTC, WebSockets, localStorage, or React.
 * That's what makes it trivial to unit test (see /web/tests/game/engine.test.ts)
 * and what guarantees gameplay logic can never accidentally depend on a
 * browser API that isn't available in a Node test runner.
 *
 * Every remote message is re-validated against the exact same rules
 * (`game/rules/validation.ts`) that gate local actions — a compromised or
 * buggy peer cannot force an illegal transition.
 */
import type { GameState, PlayerId } from "@/game/types";
import { otherPlayer } from "@/game/types";
import type { LocalAction } from "@/game/events/actions";
import type { GameMessage } from "@/networking/protocol/messages";
import {
  canEndTurn,
  canGuess,
  canReportGuessResult,
  canRestart,
  canSelectCharacter,
  canSetDifficulty,
  canSetReady,
} from "@/game/rules/validation";
import { hashCommitment, verifyCommitment } from "@/game/rules/commitment";
import { getCharactersByIds } from "@/data/difficulty";

export interface EngineResult {
  state: GameState;
  outgoing: GameMessage[];
  /** Non-null if the action/message was rejected. `state` is unchanged (same reference) in that case. */
  error: string | null;
}

function ok(state: GameState, outgoing: GameMessage[] = []): EngineResult {
  return { state, outgoing, error: null };
}

function rejected(state: GameState, error: string): EngineResult {
  return { state, outgoing: [], error };
}

function clone(state: GameState): GameState {
  return structuredClone(state);
}

function maybeAdvanceToSelecting(state: GameState): void {
  if (state.status === "lobby" && state.players.host.ready && state.players.guest.ready) {
    state.status = "selecting";
  }
}

function maybeAdvanceToPlaying(state: GameState): void {
  if (
    state.status === "selecting" &&
    state.players.host.hasSelectedCharacter &&
    state.players.guest.hasSelectedCharacter
  ) {
    state.status = "playing";
    state.currentTurn = "host"; // fixed convention, known to both peers without a message
  }
}

function resetForRestart(state: GameState): void {
  state.status = "selecting";
  state.players.host.hasSelectedCharacter = false;
  state.players.guest.hasSelectedCharacter = false;
  state.localSecret = null;
  state.remoteCommitment = null;
  state.eliminatedByLocalPlayer = [];
  state.pendingGuess = null;
  state.winner = null;
  state.gameOverReason = null;
  state.reveals = [];
  state.currentTurn = "host";
}

// ---------------------------------------------------------------------------
// Local actions (from the UI)
// ---------------------------------------------------------------------------

export function applyLocalAction(prev: GameState, action: LocalAction): EngineResult {
  const local = prev.localPlayerId;
  const state = clone(prev);

  switch (action.type) {
    case "CONNECTION_ESTABLISHED": {
      state.players[local].name = action.localName;
      if (state.status === "idle") state.status = "lobby";
      return ok(state, [{ type: "HELLO", name: action.localName }]);
    }

    case "SET_DIFFICULTY": {
      const check = canSetDifficulty(prev, local);
      if (!check.ok) return rejected(prev, check.error);
      const characters = getCharactersByIds(action.characterIds);
      if (characters.length === 0) return rejected(prev, "SET_DIFFICULTY resolved to zero valid characters");
      state.difficulty = action.level;
      state.characters = characters;
      return ok(state, [{ type: "SET_DIFFICULTY", level: action.level, characterIds: action.characterIds }]);
    }

    case "SET_NAME": {
      const trimmed = action.name.trim().slice(0, 24);
      if (!trimmed) return rejected(prev, "Name cannot be empty");
      if (trimmed === prev.players[local].name) return ok(state); // no-op, nothing to announce
      state.players[local].name = trimmed;
      return ok(state, [{ type: "RENAME", name: trimmed }]);
    }

    case "SET_READY": {
      const check = canSetReady(prev);
      if (!check.ok) return rejected(prev, check.error);
      state.players[local].ready = true;
      maybeAdvanceToSelecting(state);
      return ok(state, [{ type: "PLAYER_READY" }]);
    }

    case "SELECT_CHARACTER": {
      const check = canSelectCharacter(prev, local, action.characterId);
      if (!check.ok) return rejected(prev, check.error);
      const commitment = hashCommitment(action.characterId, action.salt);
      state.localSecret = { characterId: action.characterId, salt: action.salt };
      state.players[local].hasSelectedCharacter = true;
      maybeAdvanceToPlaying(state);
      return ok(state, [{ type: "SELECT_CHARACTER", commitment }]);
    }

    case "END_TURN": {
      const check = canEndTurn(prev, local);
      if (!check.ok) return rejected(prev, check.error);
      state.currentTurn = otherPlayer(state.currentTurn);
      return ok(state, [{ type: "END_TURN" }]);
    }

    case "ELIMINATE_CHARACTER": {
      if (prev.status !== "playing") return rejected(prev, "Cannot eliminate outside of active play");
      if (!state.eliminatedByLocalPlayer.includes(action.characterId)) {
        state.eliminatedByLocalPlayer.push(action.characterId);
      }
      return ok(state); // local-only bookkeeping — nothing is sent over the network
    }

    case "RESTORE_CHARACTER": {
      state.eliminatedByLocalPlayer = state.eliminatedByLocalPlayer.filter((id) => id !== action.characterId);
      return ok(state);
    }

    case "GUESS_CHARACTER": {
      const check = canGuess(prev, local, action.characterId);
      if (!check.ok) return rejected(prev, check.error);
      state.pendingGuess = { characterId: action.characterId, guessedBy: local };
      return ok(state, [{ type: "GUESS_CHARACTER", characterId: action.characterId }]);
    }

    case "RESTART": {
      const check = canRestart(prev);
      if (!check.ok) return rejected(prev, check.error);
      resetForRestart(state);
      return ok(state, [{ type: "RESTART_GAME" }]);
    }

    case "OPPONENT_DISCONNECTED": {
      const remote = otherPlayer(local);
      state.players[remote].connected = false;
      if (prev.status === "playing") {
        state.status = "finished";
        state.winner = local;
        state.gameOverReason = "opponent-left";
        state.pendingGuess = null;
      }
      return ok(state);
    }

    default: {
      const exhaustive: never = action;
      return rejected(prev, `Unhandled local action: ${JSON.stringify(exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Remote messages (from the peer, already structurally validated)
// ---------------------------------------------------------------------------

export function applyRemoteMessage(prev: GameState, message: GameMessage, from: PlayerId): EngineResult {
  if (from === prev.localPlayerId) {
    return rejected(prev, "Received a message claiming to be from ourselves");
  }
  const state = clone(prev);

  switch (message.type) {
    case "HELLO": {
      state.players[from].connected = true;
      state.players[from].name = message.name;
      if (state.status === "idle") state.status = "lobby";
      return ok(state);
    }

    case "RENAME": {
      state.players[from].name = message.name;
      return ok(state);
    }

    case "SET_DIFFICULTY": {
      // canSetDifficulty checks playerId === "host", so a rogue guest
      // sending this is rejected here exactly like a rogue local action.
      const check = canSetDifficulty(prev, from);
      if (!check.ok) return rejected(prev, check.error);
      const characters = getCharactersByIds(message.characterIds);
      if (characters.length === 0) return rejected(prev, "SET_DIFFICULTY resolved to zero valid characters");
      state.difficulty = message.level;
      state.characters = characters;
      return ok(state);
    }

    case "PLAYER_READY": {
      const check = canSetReady(prev);
      if (!check.ok) return rejected(prev, check.error);
      state.players[from].ready = true;
      maybeAdvanceToSelecting(state);
      return ok(state);
    }

    case "SELECT_CHARACTER": {
      if (prev.status !== "selecting") {
        return rejected(prev, `Cannot select a character in status "${prev.status}"`);
      }
      if (prev.players[from].hasSelectedCharacter) {
        return rejected(prev, `Player "${from}" already selected a character`);
      }
      state.remoteCommitment = message.commitment;
      state.players[from].hasSelectedCharacter = true;
      maybeAdvanceToPlaying(state);
      return ok(state);
    }

    case "END_TURN": {
      const check = canEndTurn(prev, from);
      if (!check.ok) return rejected(prev, check.error);
      state.currentTurn = otherPlayer(state.currentTurn);
      return ok(state);
    }

    case "GUESS_CHARACTER": {
      // `from` is the guesser; the LOCAL player is being guessed about and
      // is the only one who can authoritatively confirm/deny the guess.
      const check = canGuess(prev, from, message.characterId);
      if (!check.ok) return rejected(prev, check.error);
      if (!prev.localSecret) {
        return rejected(prev, "Local player has no secret to check the guess against");
      }
      state.pendingGuess = { characterId: message.characterId, guessedBy: from };

      const correct = prev.localSecret.characterId === message.characterId;
      state.status = "finished";
      state.winner = correct ? from : prev.localPlayerId;
      state.gameOverReason = correct ? "correct-guess" : "wrong-guess";
      state.reveals = [{ playerId: prev.localPlayerId, characterId: prev.localSecret.characterId }];

      return ok(state, [
        {
          type: "GUESS_RESULT",
          correct,
          characterId: prev.localSecret.characterId,
          salt: prev.localSecret.salt,
        },
      ]);
    }

    case "GUESS_RESULT": {
      const check = canReportGuessResult(prev, from);
      if (!check.ok) return rejected(prev, check.error);
      if (!prev.remoteCommitment) {
        return rejected(prev, "No remote commitment on file to verify against");
      }
      if (!verifyCommitment(prev.remoteCommitment, message.characterId, message.salt)) {
        return rejected(prev, "Commitment verification failed — reveal does not match earlier commitment");
      }
      const guesserId = prev.pendingGuess!.guessedBy;
      state.status = "finished";
      state.winner = message.correct ? guesserId : from;
      state.gameOverReason = message.correct ? "correct-guess" : "wrong-guess";
      state.reveals = [{ playerId: from, characterId: message.characterId }];
      state.pendingGuess = null;
      return ok(state);
    }

    case "RESTART_GAME": {
      if (prev.status === "finished") {
        resetForRestart(state);
        return ok(state);
      }
      if (prev.status === "selecting") {
        // We already restarted locally (both players clicked restart around
        // the same time) — this is an idempotent no-op, not an error.
        return ok(state);
      }
      return rejected(prev, `Unexpected RESTART_GAME while in status "${prev.status}"`);
    }

    case "PLAYER_LEFT": {
      // Mirrors the local OPPONENT_DISCONNECTED action exactly, just
      // triggered by an explicit "I'm leaving" message instead of the
      // connection layer eventually giving up after its reconnect grace
      // period — same rule: only declare a win if a game was in progress.
      state.players[from].connected = false;
      if (prev.status === "playing") {
        state.status = "finished";
        state.winner = prev.localPlayerId;
        state.gameOverReason = "opponent-left";
        state.pendingGuess = null;
      }
      return ok(state);
    }

    case "PING":
    case "PONG": {
      // Handled entirely by the connection/heartbeat layer before it ever
      // reaches the engine; if one slips through, it's a harmless no-op.
      return ok(state);
    }

    default: {
      const exhaustive: never = message;
      return rejected(prev, `Unhandled remote message: ${JSON.stringify(exhaustive)}`);
    }
  }
}
