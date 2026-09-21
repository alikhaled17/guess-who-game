"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { TRANSLATIONS, type Lang } from "./translations";

const STORAGE_KEY = "guesswho:lang";
const DEFAULT_LANG: Lang = "ar";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Looks up a dot-path in TRANSLATIONS (e.g. "playing.yourTurn") and substitutes any {param} placeholders. */
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getByPath(path: string): { ar: string; en: string } | undefined {
  const parts = path.split(".");
  let node: unknown = TRANSLATIONS;
  for (const part of parts) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node as { ar: string; en: string } | undefined;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match));
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "ar" || stored === "en") setLangState(stored);
    } catch {
      /* localStorage unavailable — stick with the default */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  function setLang(next: Lang) {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* non-fatal */
    }
  }

  function t(key: string, params?: Record<string, string | number>): string {
    const entry = getByPath(key);
    if (!entry) {
      console.warn(`[i18n] missing translation key: "${key}"`);
      return key;
    }
    return interpolate(entry[lang], params);
  }

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useTranslation(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useTranslation() must be used inside <LanguageProvider>");
  }
  return ctx;
}
