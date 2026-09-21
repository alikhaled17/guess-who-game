"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

const STEPS = ["step1", "step2", "step3", "step4"] as const;

/**
 * A quick "how to play" reference for anyone opening the app for the
 * first time — lives on the home screen (before a game starts), not
 * inside an active room, since that's when a newcomer actually needs it.
 */
export function GameRules() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-[44px] w-full rounded-2xl border-2 border-navy/40 bg-surface2 px-6 py-2 text-sm font-bold text-textMuted transition-all active:scale-[0.98]"
      >
        {t("gameRules.toggle")}
      </button>
    );
  }

  return (
    <div className="glass-card max-h-72 space-y-3 overflow-y-auto rounded-2xl bg-surface p-4 text-start">
      <p className="rounded-xl border-2 border-secondary bg-secondary/20 px-3 py-2 text-sm font-bold text-textPrimary">
        {t("gameRules.wifiNote")}
      </p>
      {STEPS.map((step) => (
        <div key={step}>
          <p className="font-bold text-textPrimary">{t(`gameRules.${step}Title`)}</p>
          <p className="text-sm text-textMuted">{t(`gameRules.${step}Body`)}</p>
        </div>
      ))}
      <button type="button" onClick={() => setOpen(false)} className="w-full py-2 text-sm text-textMuted">
        {t("gameRules.hide")}
      </button>
    </div>
  );
}
