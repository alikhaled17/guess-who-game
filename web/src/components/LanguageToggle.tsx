"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";

interface LanguageToggleProps {
  /** When true, renders as a small fixed corner pill (used inside an active game room). Otherwise a normal inline button (used on the home screen). */
  fixed?: boolean;
}

export function LanguageToggle({ fixed = false }: LanguageToggleProps) {
  const { lang, setLang } = useTranslation();
  const next = lang === "ar" ? "en" : "ar";
  const label = lang === "ar" ? "EN" : "عربي";

  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      aria-label={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      className={
        fixed
          ? "fixed right-4 z-30 flex h-11 min-w-[44px] items-center justify-center rounded-full border-[3px] border-navy bg-white/70 px-3 text-sm font-bold text-navy shadow-md shadow-navy/15 backdrop-blur-sm transition-all active:scale-90"
          : "inline-flex items-center justify-center rounded-full border-2 border-navy/70 bg-white/20 px-4 py-2 text-sm font-bold text-onGradient backdrop-blur-sm transition-all active:scale-95"
      }
      style={fixed ? { top: "max(1rem, env(safe-area-inset-top))" } : undefined}
    >
      {label}
    </button>
  );
}
