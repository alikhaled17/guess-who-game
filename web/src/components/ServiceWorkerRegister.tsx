"use client";

import { useEffect } from "react";

/** Registers the PWA service worker once, client-side only. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return; // avoid caching stale assets during `next dev`

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("[pwa] service worker registration failed:", err);
      });
    };

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
