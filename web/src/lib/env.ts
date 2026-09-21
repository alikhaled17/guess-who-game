import type { IceServerConfig } from "@/networking/webrtc/peerConnection";

/**
 * Only two environment variables exist in this project, both public
 * (NEXT_PUBLIC_*) because the client needs them directly; see README for
 * how to set them per environment. No secrets, no server-side env vars —
 * the signaling server needs none of this app's config, and this app
 * needs no database/auth config.
 */

export function getSignalingUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SIGNALING_URL;
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") {
    const isSecure = window.location.protocol === "https:";
    // Sensible local-dev default: signaling server on port 8080 alongside `next dev`.
    return `${isSecure ? "wss" : "ws"}://${window.location.hostname}:8080`;
  }
  return "ws://localhost:8080";
}

/** Optional extra STUN/TURN server, e.g. "turn:example.com:3478|user|pass". */
export function getExtraIceServers(): IceServerConfig[] {
  const raw = process.env.NEXT_PUBLIC_TURN_SERVER;
  if (!raw) return [];
  const [urls, username, credential] = raw.split("|");
  if (!urls) return [];
  return [{ urls, username, credential }];
}
