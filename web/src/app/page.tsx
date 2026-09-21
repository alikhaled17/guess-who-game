"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { NameInput } from "@/components/NameInput";
import { LanguageToggle } from "@/components/LanguageToggle";
import { SuggestedQuestions } from "@/components/SuggestedQuestions";
import { GameRules } from "@/components/GameRules";
import { generateGameId } from "@/lib/random";
import { randomDefaultName, useLocalPlayerName } from "@/hooks/useLocalPlayerName";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

function extractGameId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("join");
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
    return parts[parts.length - 1] || null;
  } catch {
    // Not a full URL — treat the raw text as the id itself.
    return /^[a-z0-9]{4,32}$/i.test(trimmed) ? trimmed : null;
  }
}

export default function HomePage() {
  const router = useRouter();
  const { t, lang } = useTranslation();
  const [name, setName] = useLocalPlayerName();
  const [showPaste, setShowPaste] = useState(false);
  const [pasted, setPasted] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);

  function handleStart() {
    if (!name.trim()) setName(randomDefaultName(lang));
    const gameId = generateGameId();
    try {
      window.sessionStorage.setItem(`guesswho:role:${gameId}`, "host");
    } catch {
      /* sessionStorage unavailable — role will default to host on first visit anyway */
    }
    router.push(`/game/${gameId}`);
  }

  function handleJoinSubmit() {
    const gameId = extractGameId(pasted);
    if (!gameId) {
      setPasteError(t("home.invalidLink"));
      return;
    }
    router.push(`/join/${gameId}`);
  }

  return (
    <main className="safe-x flex min-h-dvh flex-col items-center justify-center gap-10 px-4 py-10 text-center">
      <div className="fixed right-4 top-4 z-30" style={{ top: "max(1rem, env(safe-area-inset-top))" }}>
        <LanguageToggle />
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="text-6xl">🎮</div>
        <h1 className="text-3xl font-extrabold">{t("home.title")}</h1>
        <p className="max-w-xs text-white/85">{t("home.subtitle")}</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <NameInput value={name} onChange={setName} />
        <Button onClick={handleStart}>{t("home.startGame")}</Button>

        {!showPaste ? (
          <Button variant="ghost" onClick={() => setShowPaste(true)}>
            {t("home.haveInviteLink")}
          </Button>
        ) : (
          <div className="glass-card space-y-2 rounded-3xl bg-surface p-4 text-start">
            <label className="block text-sm text-textMuted">{t("home.pasteLinkLabel")}</label>
            <input
              value={pasted}
              onChange={(e) => {
                setPasted(e.target.value);
                setPasteError(null);
              }}
              placeholder="https://..."
              dir="ltr"
              className="w-full rounded-xl border-2 border-navy/30 bg-surface2 px-4 py-3 text-left text-sm text-textPrimary outline-none focus:ring-2 focus:ring-primary"
            />
            {pasteError && <p className="text-sm text-danger">{pasteError}</p>}
            <Button onClick={handleJoinSubmit}>{t("common.join")}</Button>
          </div>
        )}

        <GameRules />
        <SuggestedQuestions />
      </div>
    </main>
  );
}
