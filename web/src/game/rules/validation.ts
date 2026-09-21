/**
 * Single source of truth for "is this action legal right now". Both the
 * local-action path and the remote-message path in the engine run through
 * these checks, so a malicious or buggy peer can never do anything a
 * legitimate local action couldn't also be blocked from doing.
 */
import type { GameState, PlayerId } from "@/game/types";
import { otherPlayer } from "@/game/types";

export type RuleResult = { ok: true } | { ok: false; error: string };

const OK: RuleResult = { ok: true };
const fail = (error: string): RuleResult => ({ ok: false, error });

/**
 * A characterId is only legal if it's in the CURRENTLY ACTIVE difficulty
 * pool (`state.characters`), not just anywhere in the full roster. Without
 * this, a player could select or guess a character outside the chosen
 * difficulty (e.g. picking a hard-only character while playing on easy).
 */
function isInActivePool(state: GameState, characterId: string): boolean {
  return state.characters.some((c) => c.id === characterId);
}

export function canSetReady(state: GameState): RuleResult {
  if (state.status !== "idle" && state.status !== "lobby") {
    return fail(`Cannot set ready in status "${state.status}"`);
  }
  return OK;
}

/**
 * Only the host can choose the difficulty (character count), and only
 * before either player has readied up — the UI hides the picker once the
 * host taps ready, but the engine enforces it regardless in case a stale
 * message arrives late.
 */
export function canSetDifficulty(state: GameState, playerId: PlayerId): RuleResult {
  if (playerId !== "host") {
    return fail("Only the host can set the difficulty");
  }
  if (state.status !== "lobby") {
    return fail(`Cannot set difficulty in status "${state.status}"`);
  }
  if (state.players.host.ready) {
    return fail("Cannot change difficulty after readying up");
  }
  return OK;
}

export function canSelectCharacter(state: GameState, playerId: PlayerId, characterId: string): RuleResult {
  if (state.status !== "selecting") {
    return fail(`Cannot select a character in status "${state.status}"`);
  }
  if (state.players[playerId].hasSelectedCharacter) {
    return fail(`Player "${playerId}" already selected a character`);
  }
  if (!isInActivePool(state, characterId)) {
    return fail(`Unknown or out-of-pool characterId "${characterId}"`);
  }
  return OK;
}

/**
 * Ending your turn is a self-report: the two players ask/answer questions
 * out loud, so the app has no way to verify a question actually happened.
 * It only enforces WHO is allowed to end the turn and WHEN (their own
 * turn, and not while a guess is being resolved).
 */
export function canEndTurn(state: GameState, playerId: PlayerId): RuleResult {
  if (state.status !== "playing") {
    return fail(`Cannot end a turn in status "${state.status}"`);
  }
  if (state.pendingGuess) {
    return fail("Cannot end a turn while a guess is being resolved");
  }
  if (state.currentTurn !== playerId) {
    return fail(`Player "${playerId}" cannot act outside their turn`);
  }
  return OK;
}

export function canGuess(state: GameState, playerId: PlayerId, characterId: string): RuleResult {
  if (state.status !== "playing") {
    return fail(`Cannot guess in status "${state.status}"`);
  }
  if (state.pendingGuess) {
    return fail("A guess is already being resolved");
  }
  if (state.currentTurn !== playerId) {
    return fail(`Player "${playerId}" cannot act outside their turn`);
  }
  if (!isInActivePool(state, characterId)) {
    return fail(`Unknown or out-of-pool characterId "${characterId}"`);
  }
  return OK;
}

export function canReportGuessResult(state: GameState, playerId: PlayerId): RuleResult {
  if (state.status !== "playing") {
    return fail(`Cannot report a guess result in status "${state.status}"`);
  }
  if (!state.pendingGuess) {
    return fail("No pending guess to report on");
  }
  // The player reporting must be the one who was guessed about (not the guesser).
  const expectedResponder = otherPlayer(state.pendingGuess.guessedBy);
  if (expectedResponder !== playerId) {
    return fail(`Player "${playerId}" is not the expected guess responder`);
  }
  return OK;
}

export function canRestart(state: GameState): RuleResult {
  if (state.status !== "finished") {
    return fail(`Cannot restart in status "${state.status}"`);
  }
  return OK;
}
