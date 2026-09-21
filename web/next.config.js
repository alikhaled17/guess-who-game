const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: false, // we register manually in ServiceWorkerRegister.tsx, on our own schedule
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    // App shell + game assets are all static/self-hosted, so a network-first
    // strategy for pages and cache-first for hashed build assets gives a
    // fully working offline shell after the first load (see project spec
    // section 17). Gameplay itself still needs a live network path for the
    // WebRTC handshake — offline PWA does not mean offline multiplayer.
    runtimeCaching: [
      {
        urlPattern: ({ request }) => request.mode === "navigate",
        handler: "NetworkFirst",
        options: {
          cacheName: "pages",
          networkTimeoutSeconds: 3,
        },
      },
      {
        urlPattern: ({ request }) =>
          request.destination === "style" ||
          request.destination === "script" ||
          request.destination === "font",
        handler: "StaleWhileRevalidate",
        options: { cacheName: "static-assets" },
      },
      {
        urlPattern: ({ request }) => request.destination === "image",
        handler: "CacheFirst",
        options: {
          cacheName: "images",
          expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fully static deploy target (Cloudflare Pages) — the app has no API
  // routes, server actions, or ISR, so there's nothing an actual Next.js
  // server would ever need to do at request time. `headers()` isn't
  // supported in export mode; the equivalent Cache-Control rules live in
  // public/_headers instead (Cloudflare Pages' own convention).
  output: "export",
};

module.exports = withPWA(nextConfig);
