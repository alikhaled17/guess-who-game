"use client";

import { useState } from "react";
import { QUESTIONS } from "@/data/questions";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

/**
 * A purely local reference sheet — nothing here ever touches the network.
 * Players are sitting together and ask/answer questions out loud (see
 * CLAUDE.md "Why question/answer is verbal, not networked"); this just
 * helps someone who's drawing a blank on what to ask next.
 */
export function SuggestedQuestions() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-[44px] w-full rounded-2xl border-2 border-navy/40 bg-surface2 px-6 py-2 text-sm font-bold text-textMuted transition-all active:scale-[0.98]"
      >
        {t("suggestedQuestions.toggle")}
      </button>
    );
  }

  return (
    <div className="glass-card max-h-56 space-y-2 overflow-y-auto rounded-2xl bg-surface p-3">
      <p className="px-1 text-xs text-textMuted">{t("suggestedQuestions.hint")}</p>
      {QUESTIONS.map((id) => (
        <p key={id} className="w-full rounded-xl bg-surface2 px-4 py-3 text-start text-base">
          {t(`questions.${id}`)}
        </p>
      ))}
      <button type="button" onClick={() => setOpen(false)} className="w-full py-2 text-sm text-textMuted">
        {t("suggestedQuestions.hide")}
      </button>
    </div>
  );
}
