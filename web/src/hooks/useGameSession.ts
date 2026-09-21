"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DifficultyLevel, GameState, PlayerId } from "@/game/types";
import { otherPlayer } from "@/game/types";
import { createInitialState, DEFAULT_DIFFICULTY } from "@/game/state/initialState";
import { applyLocalAction, applyRemoteMessage } from "@/game/engine/engine";
import type { LocalAction } from "@/game/events/actions";
import { ConnectionManager, type ConnectionStatus } from "@/networking/connection/connectionManager";
import { getExtraIceServers, getSignalingUrl } from "@/lib/env";
import { generateSalt } from "@/lib/random";
import { pickRandomCharacterIds } from "@/data/difficulty";
import { clearGameStateSnapshot, loadGameStateSnapshot, saveGameStateSnapshot } from "@/lib/gameStateStorage";

export interface UseGameSessionParams {
  gameId: string;
  role: PlayerId;
  localName: string;
}

export interface GameSessionActions {
  /** Edits the local player's own display name after already connecting, re-announcing it to the peer. */
  setName: (name: string) => void;
  setDifficulty: (level: DifficultyLevel) => void;
  setReady: () => void;
  selectCharacter: (characterId: string) => void;
  endTurn: () => void;
  eliminateCharacter: (characterId: string) => void;
  restoreCharacter: (characterId: string) => void;
  guessCharacter: (characterId: string) => void;
  restart: () => void;
  reconnect: () => void;
  /**
   * Intentionally ends the room: tells the other peer right away (so they
   * don't have to wait out the reconnect grace period to find out),
   * closes the connection, and clears this tab's saved snapshot so a
   * later visit to the same gameId starts fresh rather than resuming a
   * room its owner deliberately left.
   */
  leaveGame: () => void;
}

export interface UseGameSessionResult {
  state: GameState;
  status: ConnectionStatus;
  actions: GameSessionActions;
  lastError: string | null;
}

export function useGameSession({ gameId, role, localName }: UseGameSessionParams): UseGameSessionResult {
  // A page refresh remounts this hook with a brand-new React tree, but the
  // room/game itself may still be live — resume from the last snapshot
  // instead of always starting over at "idle". See lib/gameStateStorage.ts.
  const stateRef = useRef<GameState>(
    loadGameStateSnapshot(gameId, role) ?? createInitialState({ gameId, localPlayerId: role, localName }),
  );
  const [state, setState] = useState<GameState>(stateRef.current);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const managerRef = useRef<ConnectionManager | null>(null);

  const commitState = useCallback(
    (next: GameState) => {
      stateRef.current = next;
      setState(next);
      saveGameStateSnapshot(gameId, role, next);
    },
    [gameId, role],
  );

  const runLocal = useCallback(
    (action: LocalAction) => {
      const result = applyLocalAction(stateRef.current, action);
      if (result.error) {
        setLastError(result.error);
        return;
      }
      setLastError(null);
      commitState(result.state);
      for (const message of result.outgoing) {
        managerRef.current?.send(message);
      }
    },
    [commitState],
  );

  useEffect(() => {
    const remoteId = otherPlayer(role);
    const manager = new ConnectionManager(
      { gameId, role, signalingUrl: getSignalingUrl(), extraIceServers: getExtraIceServers() },
      {
        onStatusChange: (next) => {
          setStatus(next);
          if (next === "connected") {
            runLocal({ type: "CONNECTION_ESTABLISHED", localName });
            // Only for a genuinely fresh session (no pool yet — see
            // game/state/initialState.ts). On a reconnect after a refresh
            // mid-game, a restored snapshot already has a pool and this
            // would either be silently rejected (status isn't "lobby"
            // anymore) or, worse, quietly overwrite an in-lobby difficulty
            // choice with the default — skip it entirely once a pool
            // already exists.
            if (role === "host" && stateRef.current.characters.length === 0) {
              // The host generates the random character draw for the
              // default difficulty right away and broadcasts it, so the
              // guest never sees an empty pool by the time they reach the
              // character-selection screen. See initialState.ts for why
              // this can't just be computed identically on both sides.
              runLocal({
                type: "SET_DIFFICULTY",
                level: DEFAULT_DIFFICULTY,
                characterIds: pickRandomCharacterIds(DEFAULT_DIFFICULTY),
              });
            }
          }
        },
        onMessage: (message) => {
          const result = applyRemoteMessage(stateRef.current, message, remoteId);
          if (result.error) {
            console.warn("[game] rejected remote message:", result.error);
            return;
          }
          commitState(result.state);
          for (const out of result.outgoing) {
            manager.send(out);
          }
        },
        onGiveUp: () => {
          runLocal({ type: "OPPONENT_DISCONNECTED" });
        },
      },
    );
    managerRef.current = manager;
    manager.connect();

    return () => {
      manager.close();
      managerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally a one-time connect per gameId/role
  }, [gameId, role]);

  const actions: GameSessionActions = {
    setName: (name) => runLocal({ type: "SET_NAME", name }),
    setDifficulty: (level) => runLocal({ type: "SET_DIFFICULTY", level, characterIds: pickRandomCharacterIds(level) }),
    setReady: () => runLocal({ type: "SET_READY" }),
    selectCharacter: (characterId) => runLocal({ type: "SELECT_CHARACTER", characterId, salt: generateSalt() }),
    endTurn: () => runLocal({ type: "END_TURN" }),
    eliminateCharacter: (characterId) => runLocal({ type: "ELIMINATE_CHARACTER", characterId }),
    restoreCharacter: (characterId) => runLocal({ type: "RESTORE_CHARACTER", characterId }),
    guessCharacter: (characterId) => runLocal({ type: "GUESS_CHARACTER", characterId }),
    restart: () => runLocal({ type: "RESTART" }),
    reconnect: () => managerRef.current?.reconnect(),
    leaveGame: () => {
      managerRef.current?.send({ type: "PLAYER_LEFT" });
      managerRef.current?.close();
      clearGameStateSnapshot(gameId, role);
    },
  };

  return { state, status, actions, lastError };
}
