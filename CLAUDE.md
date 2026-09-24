# CLAUDE.md

Guidance for anyone (human or AI) working on this codebase. Read this before
changing `game/`, `networking/`, or the signaling server — most of what
looks like it could be "simplified" here is a deliberate trade-off, and
the reasoning is written down so it doesn't get accidentally undone.

## What this project is

A two-player character-guessing game (Guess Who), played by two people on
the same Wi-Fi network on two separate devices, with **zero backend game
logic**: no accounts, no database, no authoritative game server. The two
browsers talk directly to each other over a WebRTC DataChannel. A tiny
WebSocket signaling server exists purely to help them find each other.

## Hard architectural rules

1. **The game engine (`web/src/game/**`) never imports a browser API.**
   No `window`, `navigator`, `crypto.subtle`, `fetch`, `WebSocket`,
   `RTCPeerConnection`, and no `react`. It is pure, synchronous TypeScript:
   `(state, action) => { state, outgoing, error }`. This is what makes
   `web/tests/game/engine.test.ts` runnable in plain Node with `ts-jest`
   and no DOM/jsdom setup, and it's why the commit-reveal hash for secret
   characters (`game/rules/commitment.ts`) is a hand-rolled synchronous
   FNV-1a hash instead of `crypto.subtle.digest` — the latter is async and
   would force the whole reducer chain to become async just to satisfy a
   fairness feature.

2. **Never trust the remote peer.** Every message arriving over the
   DataChannel goes through three checks before it can touch `GameState`:
   - `networking/protocol/envelope.ts` — is this well-formed JSON, under
     the size limit, with the required envelope fields?
   - `networking/protocol/validate.ts` — does the payload match one of the
     known message shapes exactly?
   - `game/rules/validation.ts` (via `game/engine/engine.ts`) — is this
     action *legal right now* (right turn, right phase, known character/
     question id, not already done)?
   A local UI action and a remote message run through the *same* rule
   functions in step 3 — a compromised or buggy peer cannot reach any game
   state a legitimate local action couldn't also be blocked from reaching.

3. **Full `GameState` is never sent over the network.** Only small,
   specific `GameMessage`s cross the wire (see protocol section below).
   Each peer maintains its own `GameState` and reaches the same result by
   applying the same deterministic transition rules to the same messages —
   this is a CRDT-adjacent idea, not authoritative-server sync.

4. **UI components never call networking code directly.** The only thing a
   component/screen touches is `hooks/useGameSession`'s returned `actions`
   object. Flow is always:

   ```
   UI event -> actions.xxx() -> applyLocalAction() -> [state update, outgoing messages]
                                                              |
                                                    ConnectionManager.send()
                                                              |
                                                     (DataChannel, peer)
                                                              |
                                                  decodeAndValidate() -> applyRemoteMessage()
                                                              |
                                                       [state update] -> re-render
   ```

## Why question/answer is verbal, not networked

This is the single biggest deviation from a "naive" digital port of Guess
Who, and it came from a real product objection worth recording: **the two
players are physically sitting together.** An early version of this app
had `ASK_QUESTION`/`ANSWER` messages — tap a question from a list, send it
over the DataChannel, opponent taps yes/no back. In practice, two people
sitting next to each other just talk: "does yours have glasses?" / "no" —
out loud, instantly, with zero UI in the way. Forcing that exchange through
app taps didn't add anything (there's no anti-cheat value in relaying a
question digitally when the asker can just hear the answer directly), and
worse, it actively got in the way: if the players ignored the Q&A UI and
just talked (which they will, every time), the app's turn state got stuck
waiting for taps that were never coming.

So the app now only handles the three things that genuinely benefit from
being digital:

1. **Secret character selection** — needs to be hidden from the other
   player, which the app can guarantee and a shared table can't.
2. **Each player's own elimination board** — a personal deduction aid,
   already local-only and never networked (see `ELIMINATE_CHARACTER`
   below) — this didn't change.
3. **The final guess and its objective outcome** — "was I right" is worth
   settling with the same commit-reveal proof used at selection time,
   rather than just trusting a verbal "yeah you got it."

Turn-passing is now a simple self-reported `END_TURN` action/message: the
current player asks their (verbal) question, hears the (verbal) answer,
then taps "انتهى دوري" themselves. There's no in-app record of which
questions were asked or what was answered — that entire concept was
removed (`PendingQuestion`, `QuestionLogEntry`, `TurnPhase` are all gone
from `game/types`). `data/questions.ts` still exists, but purely to power
`components/SuggestedQuestions.tsx`, a local reference list a player can
glance at for inspiration — it has no `onAsk` handler, sends nothing, and
isn't tied to turn state at all.

## Game protocol — design decisions

The full message union lives in `web/src/networking/protocol/messages.ts`.
A few things are deliberately different from a "naive" first draft of this
kind of protocol, and why:

- **No `START_GAME` message.** Both peers can derive `lobby -> selecting`
  (once both `PLAYER_READY`) and `selecting -> playing` (once both
  `SELECT_CHARACTER`) purely from state they already have — there's no
  ambiguity to resolve, so a message would just be redundant traffic and
  another thing to validate.
- **First turn is a fixed convention (host always goes first), not
  negotiated.** Both peers know their own role (`host`/`guest`) from how
  the connection was established (who created vs. who joined), so no
  message is needed to agree on it.
- **No `GAME_OVER { winnerId }` message.** A `winnerId` field asserted by
  a peer is a fact you'd have to trust blindly — and this peer has every
  incentive to lie about who won. Instead, `GUESS_RESULT { correct,
  characterId, salt }` reports only a *verifiable* fact (was the guess
  right, and here's proof of what the real secret was), and **both**
  engines independently derive the winner from `correct` + the
  already-known identity of who did the guessing. See
  `game/engine/engine.ts`'s `GUESS_CHARACTER` / `GUESS_RESULT` handlers.
- **`ELIMINATE_CHARACTER` is local-only and never sent.** Crossing a
  character off your own board is bookkeeping for your own deduction
  process — it doesn't affect shared game state and the opponent has no
  legitimate reason to know your board. It's still a `LocalAction` (see
  `game/events/actions.ts`) so it's testable and consistent with the rest
  of the engine, it just produces zero `outgoing` messages.
- **Secret character selection uses commit-reveal, not "just don't send
  it".** `SELECT_CHARACTER` sends only `hashCommitment(characterId, salt)`
  — never the characterId. At guess time, the guessed-about player reveals
  `characterId + salt` in `GUESS_RESULT`, and the other engine calls
  `verifyCommitment()` to make sure that reveal matches what was committed
  at selection time (i.e., they didn't swap their secret mid-game after
  seeing how the questions were going). This is **tamper-evidence for a
  casual, trusted-opponent, same-room game** — not a cryptographic
  security boundary against a determined adversary. Treat it accordingly;
  don't "upgrade" it to real crypto without also making the whole engine
  async, which trades away rule #1 above.
- **`END_TURN` is a self-report, not a verified fact.** There's no way for
  the app to know a verbal question actually got asked — `canEndTurn` in
  `game/rules/validation.ts` only enforces WHO can end a turn (its owner)
  and WHEN (not while a guess is being resolved), trusting the players on
  everything else. This is intentional and matches how the physical game
  already works.

## Networking layer

- `networking/webrtc/peerConnection.ts` — thin wrapper around
  `RTCPeerConnection`. Knows nothing about signaling transport or game
  state; just builds/consumes SDP and ICE candidates.
- `networking/signaling/` — the WebSocket client + wire types for the
  signaling server. Deliberately its own tiny protocol
  (`create`/`join`/`signal`/`leave`), unrelated to the game protocol. If
  you change `ClientToServerMessage`/`ServerToClientMessage` in
  `signaling/types.ts`, you must mirror the change by hand in
  `signaling-server/src/types.ts` — they're not a shared package on
  purpose, because the signaling server is a separately deployable unit
  (a Cloudflare Worker + Durable Object, see README "Deployment") and
  pulling in the whole `web` TypeScript project just for a handful of
  message shapes wasn't worth the coupling. The gameId also travels as a
  `?gameId=` query param on the WebSocket URL itself now (built by
  `signalingClient.ts`'s `buildSignalingUrl`), not just in the first
  message body — the Worker has to route to the right Durable Object
  (one per room, via `idFromName(gameId)`) before the socket even opens,
  which it can only do from the URL. The original plain-Node
  implementation still exists at `signaling-server/legacy-node-server/`
  for reference/local fallback, but is not what's deployed.
- `networking/connection/connectionManager.ts` — the only class that talks
  to both of the above. Owns the full lifecycle: signaling handshake ->
  `RTCPeerConnection`/`RTCDataChannel` -> heartbeat (`PING`/`PONG` every
  5s, 15s timeout) -> automatic reconnection (ICE `disconnected` state
  triggers a 10s grace period, then a full teardown + re-run of the
  signaling handshake against the *same* `gameId`, up to 4 attempts with
  backoff before giving up and surfacing a manual "reconnect" button).
  This is the ONLY class the UI hook (`useGameSession`) talks to for
  networking — no component ever imports `RTCPeerConnection` or
  `WebSocket` directly.
- **STUN is always used, even on the same Wi-Fi.** Two devices on the same
  subnet can still fail to find each other directly (client isolation on
  the AP, weird NAT hairpinning, VPNs, etc.), so the ICE gathering process
  always runs properly rather than assuming "same network = just connect
  the sockets directly". `buildIceServers()` defaults to Google's public
  STUN server and is structured so a TURN server can be appended via
  `NEXT_PUBLIC_TURN_SERVER` later with no code changes elsewhere.

## Surviving a page refresh

`GameState` otherwise lives only in a React ref/state — a page reload used
to silently drop the player back to the very first screen ("idle") even
though their room was still live, because a fresh mount always started
from `createInitialState`. `lib/gameStateStorage.ts` fixes this by
snapshotting `GameState` to `sessionStorage` (keyed by `gameId` + role) on
every `commitState` in `hooks/useGameSession.ts`, and restoring it as the
initial value on mount instead of always calling `createInitialState`.

This does NOT persist or restore the WebRTC connection itself — that's
tied to browser-runtime objects (`RTCPeerConnection`, the DataChannel)
that cannot survive a reload under any circumstance, and always
re-handshakes from scratch via `ConnectionManager`. It only restores the
GAME progress (difficulty, who's ready, secret commitments, whose turn,
etc.), so that once the connection comes back up, a refreshed peer's
state still agrees with the other side's — which never changed — instead
of one side silently resetting to square one and the two peers going out
of sync.

`sessionStorage`, not `localStorage`, is deliberate: it survives a reload
of the SAME tab (the bug this fixes) but a genuinely new tab/window
starting the same gameId fresh is expected, not a regression to fix.

One consequence worth knowing: `useGameSession`'s "host auto-generates the
default difficulty pool on connect" logic (see "Randomized character
pool" below) is guarded by `stateRef.current.characters.length === 0` —
without that guard, reconnecting after a mid-game refresh would try to
re-roll and re-broadcast a brand new random pool on top of a restored,
already-in-progress game.

**A second, easy-to-miss consequence**: restoring the snapshot makes the
UI immediately show the resumed screen (e.g. "playing", turn buttons and
all) even though the real `RTCDataChannel` hasn't reopened yet — that
handshake still takes a few seconds. If a player taps a networked action
(`END_TURN`, `GUESS_CHARACTER`, `SET_READY`, `SET_DIFFICULTY`, `RESTART`)
during that window, `ConnectionManager.send()` silently drops it (channel
not open) while the LOCAL engine state still advances — a real desync,
discovered while testing this exact refresh scenario, not a hypothetical.
Fix: `app/game/[gameId]/GameClientPage.tsx` computes `networkReady = status ===
"connected"` and every screen takes a `disabled` prop gated on it,
disabling exactly the buttons whose action sends a network message
(`ConnectedScreen`'s ready/difficulty controls, `CharacterSelectScreen`'s
confirm, `PlayingScreen`'s end-turn/guess-confirm, `FinishedScreen`'s
restart). Purely local actions — eliminate/restore a character on your
own board — stay enabled throughout, since they're never sent anywhere.
The reconnect banner itself was widened to cover `"connecting"` too (not
just reconnecting/disconnected/failed), specifically so a resumed session
shows SOME indicator during this window instead of looking fully live.

## Game rules

- Turn order: fixed, host first. Enforced in `game/rules/validation.ts`
  (`canEndTurn`, `canGuess` both check `state.currentTurn === playerId`).
- Each turn, the current player either asks their question out loud and
  then taps "انتهى دوري" (`END_TURN`) to pass the turn, OR makes a final
  guess (ends the game, win or lose — no "guess and keep playing if
  wrong"). See "Why question/answer is verbal, not networked" above.
- A wrong guess is an instant loss — this mirrors the physical game (you
  get one shot) rather than a "20 questions" open-ended format.
- Characters and questions are pure data (`data/characters.ts`,
  `data/questions.ts`) — nothing else in the app hardcodes a count or a
  specific id, so extending the roster or the question bank is a
  data-only change.
- Character portraits are real illustrated portraits, one static asset
  path per character under `/public/characters/*.webp` (~5KB each).
  `Character.image` is just a `string` path — swapping or adding artwork
  is a data-only change, nothing else in the app needs to know.
- `Character` has NO gameplay attributes (no `hasGlasses`, `hairColor`,
  etc.) — an earlier version stored them, but nothing ever read them at
  runtime (grep `.attributes` in `src/` — zero hits before they were
  removed). They were dead weight once Q&A went verbal: the app never
  checks an answer against a character's real traits, so there was
  nothing for that data to validate. `data/questions.ts` is plain
  `{id, text}` for the same reason.

## Randomized character pool

The board is a random draw from the full roster, resized differently
every game, not a fixed set:

| Difficulty | Characters in play |
|---|---|
| easy   | 15 |
| medium | 20 |
| hard   | 30 |

`data/difficulty.ts`'s `pickRandomCharacterIds(level)` does a Fisher-Yates
shuffle of the full roster and takes the first N ids. This is the ONE
place in the codebase that intentionally breaks the "both peers derive
shared state independently" pattern used everywhere else (see "Game
protocol — design decisions" below): two independent `Math.random()` calls
on two machines never produce the same draw, so there's no way for the
guest to compute the identical pool on their own.

Instead: **only the host calls `pickRandomCharacterIds`**, and the actual
chosen id list is sent to the guest as part of `SET_DIFFICULTY`
(`networking/protocol/messages.ts`), who applies it verbatim. This mirrors
how the game engine already handles randomness elsewhere — `pickRandomCharacterIds`
lives in `data/`, is called from the HOOK layer (`hooks/useGameSession.ts`),
and the pure engine (`game/engine/engine.ts`) only ever receives the
already-decided `characterIds` array as data. It never generates randomness
itself — same pattern as `generateSalt()` for character-selection commitments.

Consequences worth knowing if you touch this:

- `game/state/initialState.ts`'s `createInitialState` starts `characters`
  as an EMPTY array. There is no "default pool" to compute on both sides
  independently the way there is for e.g. the default difficulty label —
  see that file's comment. The host immediately generates and broadcasts
  the default-difficulty draw the moment `CONNECTION_ESTABLISHED` fires
  (see the `onStatusChange` handler in `useGameSession.ts`), so in
  practice the guest's pool arrives well before a human could react, but
  `CharacterSelectScreen` still has a "جاري تحضير الشخصيات..." fallback
  for the empty-pool instant just in case.
- `game/rules/validation.ts`'s `canSelectCharacter` / `canGuess` check a
  characterId against `state.characters` (the ACTIVE pool), never against
  the full roster — a character that's real but wasn't drawn into this
  game's pool must be rejected exactly like one that doesn't exist at all.
- A rematch (`RESTART`) keeps the SAME pool as the round that just ended
  — it does not re-roll. "Every time we play, the images are different"
  was read as "every new game session", not "every rematch inside one
  session"; re-rolling on rematch too would mean re-adding a difficulty
  step after `RESTART_GAME`, which the lobby-only `canSetDifficulty` rule
  currently doesn't allow. Flag this if a rematch is expected to reshuffle
  too — it's a small, deliberate scope call, not an oversight.
- The full roster has 48 characters (`data/characters.ts`,
  `/public/characters/*.webp`), so all three tiers — including "hard" (30)
  — are genuine random subsets, not "the whole roster." (`easy`/`medium`
  are comfortably smaller than the roster too; `characterCountForDifficulty`
  in `data/difficulty.ts` clamps against `CHARACTERS.length` regardless of
  roster size, so this stays true even if the roster shrinks further.)

## Coding conventions

- TypeScript `strict: true` throughout `web/`. `noUncheckedIndexedAccess`
  is intentionally OFF (it produced a large amount of noise on ordinary,
  safe array-index access — e.g. `result.outgoing[0]` right after you just
  pushed exactly one entry — without catching real bugs; not worth the
  churn for this codebase's size).
- Absolute imports via the `@/*` path alias (`@/game/...`,
  `@/networking/...`, `@/data/...`, `@/components/...`), configured in
  `tsconfig.json` and mirrored in `jest.config.js`'s `moduleNameMapper`.
- All UI copy is in Arabic (`dir="rtl"`, `lang="ar"` set on `<html>` in
  `app/layout.tsx`). Keep new UI strings in Arabic for consistency; code
  comments and identifiers stay in English.
- The web app is a **fully static export** (`output: "export"` in
  `next.config.js`) — no API routes, no server actions, no ISR, so there's
  nothing a Next.js server would ever do at request time that the client
  doesn't already do itself. Deployed as plain static files on Cloudflare
  Pages. The two dynamic routes (`game/[gameId]`, `join/[gameId]`) are
  each split into a tiny server `page.tsx` (just `generateStaticParams`
  returning a single `{gameId: "_"}` placeholder + `dynamicParams =
  false`) and a `*ClientPage.tsx` that does the real work — static export
  can't pre-render one file per arbitrary game id, so every real
  `/game/<id>` or `/join/<id>` request is proxied by Cloudflare Pages'
  `public/_redirects` (a 200 rule, not a 301 — the address bar keeps the
  real id) to that one placeholder file, and the client page reads the
  *actual* id back out of `usePathname()` rather than trusting Next's
  route `params` (which would just be the placeholder `"_"`).
- Signaling server is a Cloudflare Worker + Durable Object (TypeScript,
  `signaling-server/src/worker.ts` + `signalingRoom.ts`) using the
  WebSocket Hibernation API — one Durable Object instance per room,
  addressed deterministically via `idFromName(gameId)`. No database, no
  `ctx.storage` writes: once both sockets in a room close, the room
  forgets everything, same ephemeral behavior the old Node version got
  from an in-memory `Map` + TTL sweep, just handled by Cloudflare's own
  eviction instead of a manual timer. The original plain-Node
  implementation lives on at `signaling-server/legacy-node-server/` for
  reference/local fallback but is not the deploy target.

## Commands

```bash
# Web app
cd web
npm install
npm run dev             # http://localhost:3000, PWA disabled (dev mode)
npm run build            # static export to web/out/; generates public/sw.js
npm start                 # preview the export locally via `wrangler pages dev out`
npm run deploy             # `wrangler pages deploy out` — needs a Cloudflare account
npm run lint
npm test                    # Jest: game engine + protocol (51 tests)
npm run test:watch

# Signaling server
cd signaling-server
npm install
npm run dev              # `wrangler dev` — local Workers runtime, no account needed
npm run deploy             # `wrangler deploy` — needs a Cloudflare account
npm test                    # node:test — spawns a real `wrangler dev` and drives it
                            # with real WebSocket clients (room pairing, signal
                            # relay, reconnect, room-full/room-not-found errors)
```

## Testing instructions

- **Game engine and protocol validation** (`web/tests/`) are the primary
  test suite and must stay runnable with zero browser/DOM dependency —
  that's the whole point of keeping `game/` pure. If a new engine test
  needs `window`, `document`, or a mock of any browser API, that's a sign
  the logic being tested belongs in a hook/component instead of the
  engine.
- **Signaling server tests** (`signaling-server/tests/signalingRoom.test.js`)
  spawn a real `wrangler dev` child process (the actual Workers runtime,
  not a mock) on an ephemeral port and connect real `WebSocket` clients —
  they test the actual relay behavior (room pairing, signal relay,
  disconnect/reconnect, room-full/room-not-found errors, invalid gameId
  rejection).
- There is currently no automated browser/E2E test checked into the repo
  (adding Playwright as a project dependency wasn't judged worth it for a
  project this size). The full multiplayer flow — connect, ready up, pick
  characters, alternate turns, guess, win/lose, rematch — was manually
  verified with two independent real Chromium contexts, both against the
  original plain-Node signaling server AND, after the Cloudflare rewrite,
  against the real static Pages export (`wrangler pages dev out`) talking
  to the real Worker (`wrangler dev`) — same production topology, run
  locally. If you touch `game/engine/engine.ts` or
  `networking/connection/connectionManager.ts`, re-verify manually the
  same way since the engine tests alone don't exercise the real WebRTC
  handshake.

## Things that look wrong but are on purpose

- `resolveRole()` in `app/game/[gameId]/GameClientPage.tsx` defaults to
  `"guest"` when `sessionStorage` has no role recorded for a `gameId`.
  This is safe precisely because the *only* code path that ever writes
  `"host"` is the home page's "ابدأ لعبة" button, right before it creates
  the room and navigates — so any other way of arriving at `/game/[id]`
  (a bookmark, a shared link opened without going through `/join/[id]`
  first, a stray direct URL) is correctly treated as a guest, never a
  phantom host.
- `RESTART_GAME` handling accepts the message even when the local player
  already independently restarted (status is already `"selecting"`) and
  treats it as a no-op rather than an error — see `resetForRestart` /
  `RESTART_GAME` case in `engine.ts`. Either player can request a rematch
  unilaterally; the other side just follows along automatically the
  moment the message arrives, it does not wait for its own "restart"
  button to also be clicked.
