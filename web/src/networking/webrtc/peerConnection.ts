import type { SignalData } from "@/networking/signaling/types";

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface PeerConnectionHandlers {
  onIceCandidate: (candidate: RTCIceCandidateInit) => void;
  onDataChannel: (channel: RTCDataChannel) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
}

export const DATA_CHANNEL_LABEL = "game";

/**
 * Thin wrapper around RTCPeerConnection. Knows nothing about game state or
 * signaling transport — it only builds SDP/ICE artifacts and hands them
 * back to the caller (ConnectionManager) to relay however it likes.
 *
 * ICE servers default to Google's public STUN server. A TURN server can be
 * appended via `extraIceServers` (e.g. from an env var) without touching
 * this file — see networking/connection/connectionManager.ts.
 */
export function buildIceServers(extra: IceServerConfig[] = []): RTCIceServer[] {
  const defaults: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
  return [...defaults, ...extra];
}

export function createPeerConnection(
  iceServers: RTCIceServer[],
  handlers: PeerConnectionHandlers,
): RTCPeerConnection {
  const pc = new RTCPeerConnection({ iceServers });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      handlers.onIceCandidate(event.candidate.toJSON());
    }
  };

  pc.ondatachannel = (event) => {
    handlers.onDataChannel(event.channel);
  };

  pc.onconnectionstatechange = () => {
    handlers.onConnectionStateChange(pc.connectionState);
  };

  return pc;
}

export async function createOffer(pc: RTCPeerConnection): Promise<SignalData> {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  return { kind: "offer", sdp: offer.sdp ?? "" };
}

export async function createAnswer(pc: RTCPeerConnection): Promise<SignalData> {
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  return { kind: "answer", sdp: answer.sdp ?? "" };
}

export async function applyRemoteSignal(pc: RTCPeerConnection, data: SignalData): Promise<void> {
  if (data.kind === "offer" || data.kind === "answer") {
    await pc.setRemoteDescription({ type: data.kind, sdp: data.sdp });
  } else if (data.kind === "ice-candidate") {
    try {
      await pc.addIceCandidate(data.candidate);
    } catch {
      // Benign if it arrives before the remote description is set once or
      // twice during ICE trickling; the browser will retry via re-gathering.
    }
  }
}
