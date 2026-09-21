# Legacy Node signaling server (reference only)

This is the original plain-Node (`http` + `ws`) implementation of the
signaling relay. It's kept here for reference and as a local fallback (e.g.
`node --watch src/server.js` still works if you `npm install` in this
folder), but the deployed version of this project now uses the Cloudflare
Worker + Durable Object implementation one level up (`signaling-server/`),
which speaks the exact same wire protocol
(`web/src/networking/signaling/types.ts`) so the client needs no awareness
of which one it's talking to.

Why replaced: Cloudflare's free tier (Workers + Durable Objects with the
SQLite storage backend) has no sleep-after-idle cold start, unlike Render's
free tier, and needs no separate host for the Next.js app either — see the
root `CLAUDE.md` for the full deployment writeup.
