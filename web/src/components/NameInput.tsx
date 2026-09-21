"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";

interface NameInputProps {
  value: string;
  onChange: (value: string) => void;
}

/** Lets a player type/edit their own display name instead of keeping a random default. */
export function NameInput({ value, onChange }: NameInputProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1 text-start">
      {/* Sits directly on the page gradient (not inside a card), so it needs its own on-gradient color. */}
      <label htmlFor="player-name" className="block text-sm font-bold text-white/85">
        {t("nameInput.label")}
      </label>
      <input
        id="player-name"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={24}
        placeholder={t("nameInput.placeholder")}
        className="w-full rounded-2xl border-[3px] border-navy bg-surface2 px-4 py-3 text-start text-base text-textPrimary shadow-md shadow-navy/10 outline-none placeholder:text-textMuted/60 focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}
