"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

/**
 * Shows the app's own PWA install-steps infographic (public/HowToDownload.jpg)
 * in a full-screen modal — lives on the home screen next to GameRules, since
 * that's the moment a first-time visitor would want it.
 */
export function InstallGuide() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-[44px] w-full rounded-2xl border-2 border-navy/40 bg-surface2 px-6 py-2 text-sm font-bold text-textMuted transition-all active:scale-[0.98]"
      >
        {t("installGuide.toggle")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/70 px-4 py-8"
          onClick={() => setOpen(false)}
        >
          <div
            className="glass-card flex max-h-full w-full max-w-sm flex-col gap-3 overflow-hidden rounded-3xl bg-surface p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-center font-bold text-textPrimary">{t("installGuide.title")}</p>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element -- small local static asset, same convention as CharacterGrid */}
              <img src="/HowToDownload.jpg" alt={t("installGuide.imageAlt")} className="w-full rounded-2xl" />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-[44px] w-full rounded-2xl border-2 border-navy/40 bg-surface2 py-2 text-sm font-bold text-textMuted"
            >
              {t("installGuide.close")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
