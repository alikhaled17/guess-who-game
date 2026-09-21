/**
 * Wire protocol for messages sent over the WebRTC DataChannel between the two
 * peers. This is the ONLY thing that crosses the network for gameplay —
 * never a full GameState dump. Every message is wrapped in a versioned,
 * validated envelope (NetworkMessage) before being sent; see
 * `envelope.ts` and `validate.ts`.
 */
export const PROTOCOL_VERSION = 1;

/**
 * Discriminated union of every gameplay event that can cross the wire.
 *
 * Design note — deliberately NOT a 1:1 copy of a generic "GAME_OVER" /
 * "START_GAME" style protocol: every state transition that BOTH peers can
 * derive symmetrically and deterministically (lobby -> selecting once both
 * are ready; selecting -> playing once both have committed a character;
 * first turn = host, by fixed convention established at connection time) is
 * computed locally by each engine instead of being announced by a message.
 * Fewer messages means fewer things to validate, fewer desync bugs, and
 * nothing where a lying peer could assert a fact instead of it being
 * verified. In particular there is NO "GAME_OVER { winnerId }" message:
 * winnerId is never trusted as an asserted field. Instead the peer whose
 * secret was guessed reports only the verifiable fact (GUESS_RESULT.correct
 * + a reveal of their real character/salt), and BOTH engines independently
 * derive the winner from that fact plus the already-known guesser identity.
 *
 * There is also deliberately no ASK_QUESTION/ANSWER message. Both players
 * are physically together on the same Wi-Fi, so questions are asked and
 * answered OUT LOUD — routing that through a tap-a-question / tap-yes-no
 * UI would add friction to something people already do naturally, and
 * risks the app's turn state getting stuck if players just talk instead of
 * using it. Instead, the turn owner self-reports END_TURN once they're
 * done asking (verbally) and hearing the answer.
 */
export type GameMessage =
  /** First message sent once the DataChannel opens; exchanges display names. */
  | { type: "HELLO"; name: string }
  /**
   * A player edited their display name after HELLO already fired (e.g.
   * from the connected screen, before the game starts) — re-announces it
   * so the other side's display updates too. Same validation as HELLO.
   */
  | { type: "RENAME"; name: string }
  /**
   * Host picked a difficulty in the lobby. Unlike most messages in this
   * protocol, the exact character LIST is sent explicitly (`characterIds`)
   * rather than derived independently by each peer — the pool is a random
   * draw from the full roster (see `data/difficulty.ts`'s
   * `pickRandomCharacterIds`), and randomness generated separately on two
   * machines never matches. The host generates the draw once and this
   * message is the single source of truth both peers apply verbatim.
   */
  | { type: "SET_DIFFICULTY"; level: "easy" | "medium" | "hard"; characterIds: string[] }
  /** Player toggled "ready" in the connected/lobby screen. */
  | { type: "PLAYER_READY" }
  /**
   * Player has picked a secret character. The characterId is NEVER sent —
   * only a commitment hash (of `${characterId}:${salt}`) so the opponent
   * cannot see the secret, while a later reveal can still be verified for
   * integrity.
   */
  | { type: "SELECT_CHARACTER"; commitment: string }
  /** Turn owner is done asking their (verbal) question and hearing the answer; turn passes to the other player. */
  | { type: "END_TURN" }
  /** Turn owner, instead of ending their turn, makes a final guess at the opponent's secret. */
  | { type: "GUESS_CHARACTER"; characterId: string }
  /**
   * The guessed-about player reports whether the guess was correct and
   * reveals their real characterId + salt (so the guesser can verify the
   * earlier commitment matches — anti-cheat / integrity check). The winner
   * is DERIVED from `correct`, never asserted directly.
   */
  | { type: "GUESS_RESULT"; correct: boolean; characterId: string; salt: string }
  /** Either player requests a rematch; game resets to character selection. */
  | { type: "RESTART_GAME" }
  /**
   * Sent immediately before a player intentionally ends the room and
   * navigates away, so the remaining player finds out right away instead
   * of waiting through the connection layer's ~10s+ reconnect grace
   * period before concluding the peer is gone.
   */
  | { type: "PLAYER_LEFT" }
  /** Lightweight heartbeat used to detect silent connection death. */
  | { type: "PING" }
  | { type: "PONG" };

export type GameMessageType = GameMessage["type"];

export const ALLOWED_MESSAGE_TYPES: ReadonlySet<GameMessageType> = new Set([
  "HELLO",
  "RENAME",
  "PLAYER_READY",
  "SELECT_CHARACTER",
  "SET_DIFFICULTY",
  "END_TURN",
  "GUESS_CHARACTER",
  "GUESS_RESULT",
  "RESTART_GAME",
  "PLAYER_LEFT",
  "PING",
  "PONG",
]);
