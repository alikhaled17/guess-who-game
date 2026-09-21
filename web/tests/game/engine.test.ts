import { createInitialState } from "@/game/state/initialState";
import { applyLocalAction, applyRemoteMessage } from "@/game/engine/engine";
import { CHARACTERS } from "@/data/characters";
import type { DifficultyLevel, GameState } from "@/game/types";

/**
 * Engine tests never call the real random picker (`pickRandomCharacterIds`)
 * — that would make tests flaky/non-deterministic. Instead they build a
 * fixed, deterministic id list of the right size directly from the
 * roster, exactly like the hook does with the picker's OUTPUT (the engine
 * itself never generates randomness — see game/engine/engine.ts's header).
 */
function idsForCount(n: number): string[] {
  return CHARACTERS.slice(0, n).map((c) => c.id);
}

function freshPair(): { host: GameState; guest: GameState } {
  const host = createInitialState({ gameId: "abc123", localPlayerId: "host", localName: "Host Player" });
  const guest = createInitialState({ gameId: "abc123", localPlayerId: "guest", localName: "Guest Player" });
  return { host, guest };
}

/**
 * Simulates the full handshake: both sides connect, exchange HELLO, and
 * the host broadcasts its (deterministic, for test purposes) default
 * difficulty pool — mirroring exactly what `hooks/useGameSession.ts` does
 * in production immediately upon connecting.
 */
function connectBoth(pair: { host: GameState; guest: GameState }, level: DifficultyLevel = "medium") {
  let { host, guest } = pair;

  let r = applyLocalAction(host, { type: "CONNECTION_ESTABLISHED", localName: "Host Player" });
  host = r.state;
  const hostHello = r.outgoing[0];

  r = applyLocalAction(guest, { type: "CONNECTION_ESTABLISHED", localName: "Guest Player" });
  guest = r.state;
  const guestHello = r.outgoing[0];

  host = applyRemoteMessage(host, guestHello, "guest").state;
  guest = applyRemoteMessage(guest, hostHello, "host").state;

  const counts: Record<DifficultyLevel, number> = { easy: 15, medium: 20, hard: 30 };
  r = applyLocalAction(host, { type: "SET_DIFFICULTY", level, characterIds: idsForCount(counts[level]) });
  host = r.state;
  guest = applyRemoteMessage(guest, r.outgoing[0], "host").state;

  return { host, guest };
}

function readyBoth(pair: { host: GameState; guest: GameState }) {
  let { host, guest } = pair;
  let r = applyLocalAction(host, { type: "SET_READY" });
  host = r.state;
  const hostReady = r.outgoing[0];
  r = applyLocalAction(guest, { type: "SET_READY" });
  guest = r.state;
  const guestReady = r.outgoing[0];

  host = applyRemoteMessage(host, guestReady, "guest").state;
  guest = applyRemoteMessage(guest, hostReady, "host").state;
  return { host, guest };
}

function selectBoth(pair: { host: GameState; guest: GameState }, hostCharId: string, guestCharId: string) {
  let { host, guest } = pair;
  let r = applyLocalAction(host, { type: "SELECT_CHARACTER", characterId: hostCharId, salt: "host-salt" });
  host = r.state;
  const hostMsg = r.outgoing[0];
  r = applyLocalAction(guest, { type: "SELECT_CHARACTER", characterId: guestCharId, salt: "guest-salt" });
  guest = r.state;
  const guestMsg = r.outgoing[0];

  host = applyRemoteMessage(host, guestMsg, "guest").state;
  guest = applyRemoteMessage(guest, hostMsg, "host").state;
  return { host, guest };
}

function fullySetUpGame(hostCharId = "aaron", guestCharId = "abdelrahman") {
  let pair = freshPair();
  pair = connectBoth(pair);
  pair = readyBoth(pair);
  pair = selectBoth(pair, hostCharId, guestCharId);
  return pair;
}

describe("Game creation & connection", () => {
  it("starts in idle status for both players with an empty character pool", () => {
    const { host, guest } = freshPair();
    expect(host.status).toBe("idle");
    expect(guest.status).toBe("idle");
    expect(host.characters).toEqual([]);
    expect(guest.characters).toEqual([]);
  });

  it("moves to lobby once the local DataChannel opens", () => {
    const { host } = freshPair();
    const { state } = applyLocalAction(host, { type: "CONNECTION_ESTABLISHED", localName: "Host Player" });
    expect(state.status).toBe("lobby");
    expect(state.players.host.name).toBe("Host Player");
  });

  it("marks the remote player connected upon receiving HELLO", () => {
    const pair = connectBoth(freshPair());
    expect(pair.host.players.guest.connected).toBe(true);
    expect(pair.host.players.guest.name).toBe("Guest Player");
    expect(pair.guest.players.host.connected).toBe(true);
  });
});

describe("Renaming after connecting", () => {
  it("lets a player rename themselves and propagates it to the peer", () => {
    const pair = connectBoth(freshPair());
    const r = applyLocalAction(pair.host, { type: "SET_NAME", name: "Ahmed" });
    expect(r.error).toBeNull();
    expect(r.state.players.host.name).toBe("Ahmed");
    expect(r.outgoing).toEqual([{ type: "RENAME", name: "Ahmed" }]);

    const guestState = applyRemoteMessage(pair.guest, r.outgoing[0], "host").state;
    expect(guestState.players.host.name).toBe("Ahmed");
  });

  it("trims whitespace and rejects an empty/whitespace-only name", () => {
    const pair = connectBoth(freshPair());
    const r = applyLocalAction(pair.host, { type: "SET_NAME", name: "  Sara  " });
    expect(r.state.players.host.name).toBe("Sara");

    const rejected = applyLocalAction(pair.host, { type: "SET_NAME", name: "   " });
    expect(rejected.error).toBeTruthy();
  });

  it("is a no-op (no outgoing message) if the name did not actually change", () => {
    const pair = connectBoth(freshPair());
    const r = applyLocalAction(pair.host, { type: "SET_NAME", name: "Host Player" });
    expect(r.error).toBeNull();
    expect(r.outgoing).toEqual([]);
  });
});

describe("Joining / readiness", () => {
  it("advances to selecting only once BOTH players are ready", () => {
    let pair = connectBoth(freshPair());
    let r = applyLocalAction(pair.host, { type: "SET_READY" });
    expect(r.state.status).toBe("lobby"); // only host is ready so far

    pair = readyBoth(pair);
    expect(pair.host.status).toBe("selecting");
    expect(pair.guest.status).toBe("selecting");
  });

  it("rejects SET_READY when not in idle/lobby", () => {
    const pair = fullySetUpGame();
    const r = applyLocalAction(pair.host, { type: "SET_READY" });
    expect(r.error).toBeTruthy();
  });
});

describe("Difficulty selection", () => {
  it("starts with an empty pool — there is no deterministic default to compute independently", () => {
    const { host, guest } = freshPair();
    expect(host.characters).toEqual([]);
    expect(guest.characters).toEqual([]);
  });

  it("host broadcasting a difficulty gives both peers the IDENTICAL pool", () => {
    const pair = connectBoth(freshPair(), "medium");
    expect(pair.host.difficulty).toBe("medium");
    expect(pair.host.characters).toHaveLength(20);
    expect(pair.guest.characters.map((c) => c.id)).toEqual(pair.host.characters.map((c) => c.id));
  });

  it("lets the host change difficulty and propagates the new pool to the guest", () => {
    const pair = connectBoth(freshPair());
    const ids = idsForCount(15);
    const r = applyLocalAction(pair.host, { type: "SET_DIFFICULTY", level: "easy", characterIds: ids });
    expect(r.error).toBeNull();
    expect(r.state.characters).toHaveLength(15);
    expect(r.outgoing).toEqual([{ type: "SET_DIFFICULTY", level: "easy", characterIds: ids }]);

    const guestState = applyRemoteMessage(pair.guest, r.outgoing[0], "host").state;
    expect(guestState.difficulty).toBe("easy");
    expect(guestState.characters.map((c) => c.id)).toEqual(r.state.characters.map((c) => c.id));
  });

  it("rejects the guest trying to set the difficulty, locally or remotely", () => {
    const pair = connectBoth(freshPair());
    const ids = idsForCount(30);
    const localAttempt = applyLocalAction(pair.guest, { type: "SET_DIFFICULTY", level: "hard", characterIds: ids });
    expect(localAttempt.error).toMatch(/host/i);

    const remoteAttempt = applyRemoteMessage(
      pair.host,
      { type: "SET_DIFFICULTY", level: "hard", characterIds: ids },
      "guest",
    );
    expect(remoteAttempt.error).toMatch(/host/i);
  });

  it("rejects changing difficulty after the host has readied up", () => {
    let pair = connectBoth(freshPair());
    pair.host = applyLocalAction(pair.host, { type: "SET_READY" }).state;
    const r = applyLocalAction(pair.host, {
      type: "SET_DIFFICULTY",
      level: "hard",
      characterIds: idsForCount(30),
    });
    expect(r.error).toBeTruthy();
  });
});

describe("Character selection", () => {
  it("does not reveal the characterId to the peer — only a commitment hash", () => {
    let pair = readyBoth(connectBoth(freshPair()));
    const r = applyLocalAction(pair.host, { type: "SELECT_CHARACTER", characterId: "aaron", salt: "s" });
    expect(r.outgoing[0]).toEqual({ type: "SELECT_CHARACTER", commitment: expect.any(String) });
    expect(JSON.stringify(r.outgoing[0])).not.toContain("aaron");
  });

  it("transitions to playing once both players have selected", () => {
    const pair = fullySetUpGame();
    expect(pair.host.status).toBe("playing");
    expect(pair.guest.status).toBe("playing");
    expect(pair.host.currentTurn).toBe("host");
  });

  it("rejects selecting an unknown character id", () => {
    const pair = readyBoth(connectBoth(freshPair()));
    const r = applyLocalAction(pair.host, { type: "SELECT_CHARACTER", characterId: "nope", salt: "s" });
    expect(r.error).toMatch(/unknown/i);
  });

  it("rejects selecting a character that exists but is outside the active difficulty pool", () => {
    let pair = connectBoth(freshPair(), "easy"); // first 15 characters only
    pair = readyBoth(pair);
    // "mostafa" is a real character id, but not among the first 15 in the roster.
    const r = applyLocalAction(pair.host, { type: "SELECT_CHARACTER", characterId: "mostafa", salt: "s" });
    expect(r.error).toMatch(/unknown|out-of-pool/i);
  });

  it("rejects selecting twice", () => {
    let pair = readyBoth(connectBoth(freshPair()));
    let r = applyLocalAction(pair.host, { type: "SELECT_CHARACTER", characterId: "aaron", salt: "s" });
    const host = r.state;
    r = applyLocalAction(host, { type: "SELECT_CHARACTER", characterId: "abdelrahman", salt: "s2" });
    expect(r.error).toBeTruthy();
  });
});

describe("Turns (questions/answers happen out loud, not through the app)", () => {
  it("only allows the current-turn player to end their turn", () => {
    const pair = fullySetUpGame();
    const guestEndsTurn = applyLocalAction(pair.guest, { type: "END_TURN" });
    expect(guestEndsTurn.error).toMatch(/turn/i);
  });

  it("passes the turn to the other player and propagates it over the wire", () => {
    const pair = fullySetUpGame();
    const r = applyLocalAction(pair.host, { type: "END_TURN" });
    expect(r.error).toBeNull();
    expect(r.state.currentTurn).toBe("guest");
    expect(r.outgoing).toEqual([{ type: "END_TURN" }]);

    const guestState = applyRemoteMessage(pair.guest, r.outgoing[0], "host").state;
    expect(guestState.currentTurn).toBe("guest");
  });

  it("rejects a remote END_TURN claiming to be from the player who does not hold the turn", () => {
    const pair = fullySetUpGame();
    const result = applyRemoteMessage(pair.host, { type: "END_TURN" }, "guest");
    expect(result.error).toMatch(/turn/i);
    expect(result.state).toBe(pair.host); // state unchanged
  });

  it("rejects ending a turn while a guess is being resolved", () => {
    const pair = fullySetUpGame("aaron", "abdelrahman");
    const guessR = applyLocalAction(pair.host, { type: "GUESS_CHARACTER", characterId: "abdelrahman" });
    const r = applyLocalAction(guessR.state, { type: "END_TURN" });
    expect(r.error).toBeTruthy();
  });
});

describe("Local elimination bookkeeping", () => {
  it("is entirely local and never produces an outgoing network message", () => {
    const pair = fullySetUpGame();
    const r = applyLocalAction(pair.host, { type: "ELIMINATE_CHARACTER", characterId: "abdelrahman" });
    expect(r.error).toBeNull();
    expect(r.outgoing).toEqual([]);
    expect(r.state.eliminatedByLocalPlayer).toContain("abdelrahman");
  });

  it("can be restored (undo)", () => {
    let pair = fullySetUpGame();
    let r = applyLocalAction(pair.host, { type: "ELIMINATE_CHARACTER", characterId: "abdelrahman" });
    r = applyLocalAction(r.state, { type: "RESTORE_CHARACTER", characterId: "abdelrahman" });
    expect(r.state.eliminatedByLocalPlayer).not.toContain("abdelrahman");
  });
});

describe("Guessing and winning", () => {
  it("a correct guess makes the guesser win, and reveals the defender's character", () => {
    const pair = fullySetUpGame("aaron", "abdelrahman"); // guest secretly picked "abdelrahman"
    const guessR = applyLocalAction(pair.host, { type: "GUESS_CHARACTER", characterId: "abdelrahman" });
    expect(guessR.error).toBeNull();

    const guestR = applyRemoteMessage(pair.guest, guessR.outgoing[0], "host");
    expect(guestR.state.status).toBe("finished");
    expect(guestR.state.winner).toBe("host"); // the guesser
    expect(guestR.state.gameOverReason).toBe("correct-guess");
    expect(guestR.outgoing[0]).toMatchObject({ type: "GUESS_RESULT", correct: true, characterId: "abdelrahman" });

    const hostFinal = applyRemoteMessage(guessR.state, guestR.outgoing[0], "guest").state;
    expect(hostFinal.status).toBe("finished");
    expect(hostFinal.winner).toBe("host");
    expect(hostFinal.reveals[0]).toEqual({ playerId: "guest", characterId: "abdelrahman" });
  });

  it("a wrong guess makes the guesser lose immediately", () => {
    const pair = fullySetUpGame("aaron", "abdelrahman");
    const guessR = applyLocalAction(pair.host, { type: "GUESS_CHARACTER", characterId: "adel" }); // wrong
    const guestR = applyRemoteMessage(pair.guest, guessR.outgoing[0], "host");
    expect(guestR.state.winner).toBe("guest"); // defender wins
    expect(guestR.state.gameOverReason).toBe("wrong-guess");

    const hostFinal = applyRemoteMessage(guessR.state, guestR.outgoing[0], "guest").state;
    expect(hostFinal.winner).toBe("guest");
  });

  it("rejects a guess from the player who does not hold the current turn", () => {
    const pair = fullySetUpGame();
    const r = applyLocalAction(pair.guest, { type: "GUESS_CHARACTER", characterId: "aaron" });
    expect(r.error).toMatch(/turn/i);
  });

  it("rejects GUESS_RESULT whose reveal does not match the earlier commitment", () => {
    const pair = fullySetUpGame("aaron", "abdelrahman");
    const guessR = applyLocalAction(pair.host, { type: "GUESS_CHARACTER", characterId: "abdelrahman" });
    // Tamper with the reveal: claim a different character than what was committed to.
    const tampered = { type: "GUESS_RESULT" as const, correct: true, characterId: "adel", salt: "guest-salt" };
    const result = applyRemoteMessage(guessR.state, tampered, "guest");
    expect(result.error).toMatch(/commitment/i);
  });
});

describe("Opponent disconnect", () => {
  it("declares the remaining player the winner if the opponent leaves mid-game", () => {
    const pair = fullySetUpGame();
    const r = applyLocalAction(pair.host, { type: "OPPONENT_DISCONNECTED" });
    expect(r.state.status).toBe("finished");
    expect(r.state.winner).toBe("host");
    expect(r.state.gameOverReason).toBe("opponent-left");
  });

  it("does not fabricate a win if the opponent disconnects before the game starts", () => {
    const pair = connectBoth(freshPair());
    const r = applyLocalAction(pair.host, { type: "OPPONENT_DISCONNECTED" });
    expect(r.state.status).toBe("lobby");
    expect(r.state.winner).toBeNull();
    expect(r.state.players.guest.connected).toBe(false);
  });

  it("PLAYER_LEFT (intentional exit) declares the remaining player the winner mid-game", () => {
    const pair = fullySetUpGame();
    const r = applyRemoteMessage(pair.host, { type: "PLAYER_LEFT" }, "guest");
    expect(r.error).toBeNull();
    expect(r.state.status).toBe("finished");
    expect(r.state.winner).toBe("host");
    expect(r.state.gameOverReason).toBe("opponent-left");
    expect(r.state.players.guest.connected).toBe(false);
  });

  it("PLAYER_LEFT does not fabricate a win if sent before the game starts", () => {
    const pair = connectBoth(freshPair());
    const r = applyRemoteMessage(pair.host, { type: "PLAYER_LEFT" }, "guest");
    expect(r.error).toBeNull();
    expect(r.state.status).toBe("lobby");
    expect(r.state.winner).toBeNull();
    expect(r.state.players.guest.connected).toBe(false);
  });
});

describe("Restarting", () => {
  it("rejects restart unless the game has finished", () => {
    const pair = fullySetUpGame();
    const r = applyLocalAction(pair.host, { type: "RESTART" });
    expect(r.error).toBeTruthy();
  });

  it("resets both sides back to character selection", () => {
    const pair = fullySetUpGame("aaron", "abdelrahman");
    const guessR = applyLocalAction(pair.host, { type: "GUESS_CHARACTER", characterId: "abdelrahman" });
    const guestR = applyRemoteMessage(pair.guest, guessR.outgoing[0], "host");
    const hostFinished = applyRemoteMessage(guessR.state, guestR.outgoing[0], "guest").state;

    const restartR = applyLocalAction(hostFinished, { type: "RESTART" });
    expect(restartR.state.status).toBe("selecting");
    expect(restartR.state.winner).toBeNull();
    expect(restartR.state.players.host.hasSelectedCharacter).toBe(false);

    const guestRestarted = applyRemoteMessage(guestR.state, restartR.outgoing[0], "host").state;
    expect(guestRestarted.status).toBe("selecting");
  });

  it("treats a redundant RESTART_GAME (both players clicked restart) as a harmless no-op", () => {
    const pair = fullySetUpGame("aaron", "abdelrahman");
    const guessR = applyLocalAction(pair.host, { type: "GUESS_CHARACTER", characterId: "abdelrahman" });
    const guestR = applyRemoteMessage(pair.guest, guessR.outgoing[0], "host");
    const hostFinished = applyRemoteMessage(guessR.state, guestR.outgoing[0], "guest").state;
    const guestFinished = guestR.state;

    const hostRestarted = applyLocalAction(hostFinished, { type: "RESTART" }).state;
    const guestRestarted = applyLocalAction(guestFinished, { type: "RESTART" }).state;

    // Each side also receives the other's RESTART_GAME message after already self-resetting.
    const hostFinal = applyRemoteMessage(hostRestarted, { type: "RESTART_GAME" }, "guest");
    const guestFinal = applyRemoteMessage(guestRestarted, { type: "RESTART_GAME" }, "host");
    expect(hostFinal.error).toBeNull();
    expect(guestFinal.error).toBeNull();
    expect(hostFinal.state.status).toBe("selecting");
    expect(guestFinal.state.status).toBe("selecting");
  });
});

describe("Trust boundary: remote messages cannot bypass rules", () => {
  it("rejects a message claiming to be from ourselves", () => {
    const pair = fullySetUpGame();
    const result = applyRemoteMessage(pair.host, { type: "PLAYER_READY" }, "host");
    expect(result.error).toMatch(/ourselves/i);
  });
});
