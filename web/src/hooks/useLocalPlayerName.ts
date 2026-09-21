"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { TRANSLATIONS, type Lang } from "@/lib/i18n/translations";

const STORAGE_KEY = "guesswho:playerName";

export function randomDefaultName(lang: Lang): string {
  const names = TRANSLATIONS.defaultNames[lang];
  return names[Math.floor(Math.random() * names.length)];
}

/**
 * Persists a display name across sessions without any account/login. The
 * player can freely type/edit it (see components/NameInput.tsx); a random
 * default is only ever used to pre-fill it on first visit, never forced
 * back on top of what they're typing (e.g. while they clear the field to
 * retype — see the difference from a naive "empty -> random" setter).
 */
export function useLocalPlayerName(): [string, (name: string) => void] {
  const { lang } = useTranslation();
  const [name, setNameState] = useState<string>("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      setNameState(stored && stored.trim() ? stored : randomDefaultName(lang));
    } catch {
      setNameState(randomDefaultName(lang));
    }
    // Only ever pre-fill once on mount — deliberately not re-running when
    // `lang` changes later, or a player's already-typed/stored name would
    // get silently replaced just because they switched languages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setName = (next: string) => {
    const trimmedForStorage = next.slice(0, 24);
    setNameState(trimmedForStorage);
    try {
      window.localStorage.setItem(STORAGE_KEY, trimmedForStorage.trim());
    } catch {
      /* localStorage unavailable (private mode) — non-fatal */
    }
  };

  return [name, setName];
}
