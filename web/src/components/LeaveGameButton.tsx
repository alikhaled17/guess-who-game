"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

interface LeaveGameButtonProps {
  gameId: string;
  onLeave: () => void;
}

/**
 * A persistent exit hatch available to EITHER player at any point in a
 * room — ends the room for whoever taps it: notifies the other side,
 * closes the connection, clears this tab's saved session for the gameId,
 * and returns home. Confirmed with a small popup first since it's
 * irreversible and would otherwise be easy to tap by accident.
 */
export function LeaveGameButton({ gameId, onLeave }: LeaveGameButtonProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);

  function handleConfirm() {
    onLeave();
    try {
      window.sessionStorage.removeItem(`guesswho:role:${gameId}`);
    } catch {
      /* non-fatal */
    }
    router.push("/");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={t("leaveGame.ariaLabel")}
        className="fixed left-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-navy bg-white/70 text-lg shadow-md shadow-navy/15 backdrop-blur-sm transition-all active:scale-90"
        style={{ top: "max(1rem, env(safe-area-inset-top))" }}
      >
        🚪
      </button>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 px-6">
          <div className="glass-card w-full max-w-sm space-y-4 rounded-3xl bg-surface p-6 text-center">
            <p className="text-lg font-bold">{t("leaveGame.confirmTitle")}</p>
            <p className="text-sm text-textMuted">{t("leaveGame.confirmBody")}</p>
            <div className="flex flex-col gap-4">
              <Button variant="danger" onClick={handleConfirm}>
                {t("leaveGame.confirmButton")}
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
