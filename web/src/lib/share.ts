/**
 * One-tap sharing: Web Share API when available, clipboard copy otherwise.
 * This is the only thing standing between the user and a raw URL — no QR
 * codes, no manually typed room codes (see project UX rules).
 */
export function buildInviteLink(gameId: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/join/${gameId}`;
}

export interface ShareResult {
  method: "share" | "clipboard" | "none";
  ok: boolean;
}

export async function shareInvite(gameId: string, title: string): Promise<ShareResult> {
  const url = buildInviteLink(gameId);
  const text = title;

  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await navigator.share({ title, text, url });
      return { method: "share", ok: true };
    } catch {
      // User cancelled the share sheet, or share failed — fall through to clipboard.
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(url);
      return { method: "clipboard", ok: true };
    } catch {
      return { method: "clipboard", ok: false };
    }
  }

  return { method: "none", ok: false };
}
