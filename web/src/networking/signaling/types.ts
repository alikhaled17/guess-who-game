/**
 * Signaling protocol — used ONLY to bootstrap the WebRTC handshake (relay
 * SDP offers/answers and ICE candidates between the two peers). Once the
 * DataChannel is open, the signaling connection is no longer needed for
 * gameplay; it's kept alive only to support automatic reconnection if the
 * peer connection drops.
 *
 * No gameplay data — no questions, answers, characters, turns — ever
 * travels through this channel.
 */

export type SignalData =
  | { kind: "offer"; sdp: string }
  | { kind: "answer"; sdp: string }
  | { kind: "ice-candidate"; candidate: RTCIceCandidateInit };

export type ClientToServerMessage =
  | { type: "create"; gameId: string }
  | { type: "join"; gameId: string }
  | { type: "signal"; gameId: string; data: SignalData }
  | { type: "leave"; gameId: string };

export type ServerToClientMessage =
  | { type: "created"; gameId: string }
  | { type: "joined"; gameId: string }
  | { type: "peer-joined" }
  | { type: "peer-left" }
  | { type: "signal"; data: SignalData }
  | { type: "error"; message: string };
