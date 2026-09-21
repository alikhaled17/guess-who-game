# خمّن شخصيتي — Guess Who, peer-to-peer

A real two-device multiplayer character-guessing game. No login, no accounts,
no database, no game server. Two players on the same Wi-Fi connect directly
to each other over a **WebRTC DataChannel**; a tiny WebSocket **signaling
server** exists only to introduce them to each other.

```
Device A (host)                          Device B (guest)
   Next.js PWA                              Next.js PWA
        \                                        /
         \-------- signaling (WebSocket) -------/     <-- handshake only
                          |
                 RTCPeerConnection
                          |
        \=========== RTCDataChannel ============/     <-- ALL gameplay
```

Once the DataChannel opens, the signaling server is out of the picture.
Every question, answer, character pick, turn, and win/lose decision
travels directly between the two browsers.

## Project layout

```
Game/
├── web/                  # The Next.js PWA — the whole game client (static export)
│   ├── src/
│   │   ├── app/          # Routes: /, /join/[gameId], /game/[gameId]
│   │   │   # Each dynamic route is a tiny server page.tsx (just
│   │   │   # generateStaticParams -> one "_" placeholder, since static
│   │   │   # export can't pre-render arbitrary game ids) + a
│   │   │   # *ClientPage.tsx with the real logic, which reads the actual
│   │   │   # id from usePathname() — see public/_redirects.
│   │   ├── components/   # Presentational React components + screens
│   │   ├── game/         # Pure game engine — NO browser APIs, NO React
│   │   │   ├── types/    # GameState, Player, Character, Question, ...
│   │   │   ├── state/    # createInitialState
│   │   │   ├── rules/    # canAskQuestion, canGuess, commitment hashing...
│   │   │   ├── events/   # LocalAction union (UI -> engine)
│   │   │   └── engine/   # applyLocalAction / applyRemoteMessage reducers
│   │   ├── networking/
│   │   │   ├── protocol/   # GameMessage union, envelope, validation
│   │   │   ├── webrtc/     # RTCPeerConnection helpers
│   │   │   ├── signaling/  # WebSocket signaling client
│   │   │   └── connection/ # ConnectionManager — orchestrates the above
│   │   ├── hooks/        # useGameSession (React <-> engine <-> network glue)
│   │   ├── lib/          # env vars, random ids/salts, Web Share helper
│   │   └── data/         # characters.ts, questions.ts (extensible content)
│   ├── public/           # manifest.json, icons, generated sw.js,
│   │   │                 # _redirects + _headers (Cloudflare Pages config)
│   └── tests/            # Jest tests for the engine + protocol
└── signaling-server/      # WebSocket relay — Cloudflare Worker + Durable Object
    ├── src/worker.ts      # routes each connection to its room's Durable Object
    ├── src/signalingRoom.ts # the Durable Object: room pairing + signal relay
    ├── tests/             # node:test integration tests (spawn real `wrangler dev`)
    └── legacy-node-server/ # original plain-Node implementation (reference/fallback)
```

The three-way split enforced throughout the codebase:

- **UI** (`components/`, `app/`) never touches the network or contains game
  rules — it only calls functions from `hooks/useGameSession`.
- **Game Logic** (`game/`) is pure, synchronous, and has zero imports from
  `react`, `next`, or any browser global. It is fully unit-testable in
  plain Node (see `web/tests/game/engine.test.ts`).
- **Networking** (`networking/`) knows how to move validated `GameMessage`s
  between two peers, but has no idea what a "character" or a "turn" is.

## Running it locally

You need two terminals (or run the signaling server on a second machine —
see Deployment below).

### 1. Signaling server

```bash
cd signaling-server
npm install
npm run dev        # `wrangler dev` — runs the real Workers runtime locally
                    # on :8787 by default, no Cloudflare account needed
```

### 2. The game (PWA)

```bash
cd web
npm install
npm run dev         # http://localhost:3000
```

By default the client auto-detects the signaling server at
`ws://<same-hostname>:8080`. Since `wrangler dev`'s default port is
`8787`, either pass `--port 8080` to it, or set
`NEXT_PUBLIC_SIGNALING_URL=ws://localhost:8787` before `npm run dev`
(remember this is inlined at **build** time — for `next dev` that just
means restarting the dev server after changing it, see "Environment
variables" below). Once pointed at the right port, opening
`http://localhost:3000` in two tabs (or from a second device using your
machine's LAN IP, e.g. `http://192.168.1.10:3000`) works with no further
configuration.

### Playing across two real devices on the same Wi-Fi

1. On your dev machine, find your LAN IP (`ipconfig` / `ifconfig`).
2. Start both servers as above.
3. On Device A, open `http://<your-LAN-IP>:3000`, tap **"🎮 ابدأ لعبة"**.
4. Tap **"مشاركة اللعبة"** (uses the Web Share API, falls back to copying
   the link) and send the link to Device B by whatever means you like.
5. On Device B, open the link, tap **"انضمام للعبة"**.
6. Both devices connect over WebRTC automatically. Play.

## Testing

```bash
cd web
npm test             # Jest — game engine + protocol validation (51 tests)

cd signaling-server
npm test             # Node's built-in test runner — spawns a real `wrangler
                     # dev` (the actual Workers runtime) and drives it with
                     # real WebSocket clients: room pairing, signal relay,
                     # reconnect, room-full/room-not-found errors
```

The engine tests never spin up a browser, a WebSocket, or WebRTC — they
call `applyLocalAction` / `applyRemoteMessage` directly with plain data,
which is only possible because the engine has no dependency on any browser
API. See `CLAUDE.md` for why that separation is a hard rule in this repo.

### Real two-browser verification

This flow was additionally verified with two independent Chromium browser
contexts driving a live build against a live signaling server — first
against the original plain-Node signaling server, and again after the
Cloudflare rewrite against the exact real deploy topology run locally
(`wrangler pages dev out` serving the static export + `wrangler dev`
running the Worker): connect → ready → character selection → manual
turn-passing in both directions → guess → consistent win/lose on both
peers → rematch. Note that questions and answers themselves are spoken
between the two players, not routed through the app — see `CLAUDE.md`
"Why question/answer is verbal, not networked" for the reasoning. That
verification script isn't checked into the repo (it's a one-off manual
harness), but the same flow is exactly what `web/tests/game/engine.test.ts`
exercises at the engine level, message by message.

## Production build

```bash
cd web
npm run build         # static export to web/out/ (output: "export")
npm start              # preview it locally exactly as Cloudflare Pages would
                        # serve it (`wrangler pages dev out` — applies
                        # public/_redirects and public/_headers, not just a
                        # plain static file server). PWA/service worker only
                        # ever activate in a production build, never `next dev`.
```

`next start` doesn't work here — a fully static export has no server output
for it to serve.

## Environment variables

Only two, both public because the client needs them directly. No secrets,
no server-side config, no database URL — there's nothing else to configure.

| Variable                        | Used by | Default                                   |
|----------------------------------|---------|--------------------------------------------|
| `NEXT_PUBLIC_SIGNALING_URL`      | `web`   | `ws(s)://<current hostname>:8080`           |
| `NEXT_PUBLIC_TURN_SERVER`        | `web`   | *(none — STUN only)*. Format: `turn:host:port\|username\|credential` |

**Both are inlined at build time, not read at runtime in the browser** —
this is a static export with no server to read a live environment from.
For Cloudflare Pages, set them as build-time environment variables in the
Pages project's dashboard settings (they're then available while `npm run
build` runs, same as any other Next.js `NEXT_PUBLIC_*` var); for local
`next dev`, changing them requires restarting the dev server, not just a
page reload.

The signaling server itself takes no environment variables — Cloudflare
manages the Worker's port/host, there's no `PORT` to set.

## WebRTC / ICE

- STUN: `stun:stun.l.google.com:19302` (Google's public STUN server), used
  by default so two devices behind different NATs can still find each
  other's reachable address.
- TURN: not configured by default, but the ICE server list is built by
  `buildIceServers()` in `networking/webrtc/peerConnection.ts`, which
  appends anything from `NEXT_PUBLIC_TURN_SERVER` — add a TURN server later
  with zero code changes if some networks turn out to block direct P2P.
- Even on the same Wi-Fi network, a full ICE negotiation (not just "they're
  on the same subnet, it'll just work") is used — see `CLAUDE.md` for why
  that assumption is unsafe to skip.

## Game protocol (what crosses the DataChannel)

See `web/src/networking/protocol/messages.ts` for the authoritative,
commented definition, and `CLAUDE.md`'s "Game protocol" section for the
design rationale (in particular: why there's no `START_GAME` or
`GAME_OVER` message, and how secret character selection stays secret using
a commit-reveal scheme instead of trusting the wire).

## Deployment

Both pieces deploy to Cloudflare's free tier — no credit card required, no
sleep-after-idle cold start (unlike a free-tier Node host), and the whole
app costs genuinely $0 at the traffic this project expects. They still
deploy independently; the web app just needs
`NEXT_PUBLIC_SIGNALING_URL` set to wherever the Worker ends up **before**
the web app is built (see "Environment variables" above — it's inlined at
build time, not read at runtime).

**Signaling server (`signaling-server/`)** → a Cloudflare Worker + Durable
Object:

```bash
cd signaling-server
npx wrangler login    # first time only
npm run deploy         # wrangler deploy
```

This gives you a `https://guess-who-signaling.<your-subdomain>.workers.dev`
URL (the `wss://` scheme of the same host is what the web app needs). No
build step beyond what `wrangler deploy` does itself.

**Web app (`web/`)** → Cloudflare Pages, as a static export:

```bash
cd web
NEXT_PUBLIC_SIGNALING_URL=wss://guess-who-signaling.<your-subdomain>.workers.dev npm run build
npm run deploy          # wrangler pages deploy out — prompts for a project
                         # name on first run
```

Or connect the repo in the Cloudflare Pages dashboard instead (build
command `npm run build` in `web/`, output directory `out`, and set
`NEXT_PUBLIC_SIGNALING_URL` under the project's build environment
variables) so it redeploys on every push.

`public/_redirects` and `public/_headers` (Cloudflare Pages' own
convention files, copied into `out/` by the static export) handle the two
dynamic routes and cache headers — see the comments in each file, and
`CLAUDE.md`'s coding-conventions section, for why `game/[gameId]` and
`join/[gameId]` need this instead of Next's normal per-id static
generation.

**Local preview of the exact real topology**, without deploying anything:

```bash
cd signaling-server && npm run dev     # wrangler dev, :8787
cd web && npm run build && npm start    # wrangler pages dev out, :8788
```
