"use client";

import { useState } from "react";
import type { GameState } from "@/game/types";
import { otherPlayer } from "@/game/types";
import { CharacterGrid } from "@/components/CharacterGrid";
import { Button } from "@/components/Button";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

interface CharacterSelectScreenProps {
  state: GameState;
  onSelect: (characterId: string) => void;
  /** True while the WebRTC connection isn't fully live yet (e.g. still re-handshaking after a refresh). */
  disabled?: boolean;
}

export function CharacterSelectScreen({ state, onSelect, disabled = false }: CharacterSelectScreenProps) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<string | null>(null);
  const me = state.players[state.localPlayerId];
  const opponent = state.players[otherPlayer(state.localPlayerId)];

  function confirm() {
    if (pending) onSelect(pending);
  }

  if (me.hasSelectedCharacter) {
    return (
      <main className="safe-x flex min-h-dvh flex-col items-center justify-center gap-4 px-4 py-10 text-center">
        <div className="text-5xl">🤫</div>
        <h1 className="text-xl font-bold">{t("select.selectedTitle")}</h1>
        <p className="text-white/85">
          {opponent.hasSelectedCharacter
            ? t("select.gameStarting")
            : t("select.waitingForFriendPick", { name: opponent.name || t("common.friend") })}
        </p>
      </main>
    );
  }

  if (state.characters.length === 0) {
    // Extremely unlikely: the host generates and sends the random pool the
    // instant they connect, well before a human can react. This is a
    // friendly fallback rather than a blank grid on the off chance it's
    // still in flight (see game/state/initialState.ts).
    return (
      <main className="safe-x flex min-h-dvh flex-col items-center justify-center gap-4 px-4 py-10 text-center">
        <div className="text-4xl animate-pulse-slow">🎲</div>
        <p className="text-white/85">{t("select.preparing")}</p>
      </main>
    );
  }

  return (
    // h-dvh + overflow-hidden so only the grid below scrolls, not the page.
    <main className="safe-x flex h-dvh flex-col gap-4 overflow-hidden px-4 py-6">
      <div className="shrink-0 text-center w-[70%] mx-auto">
        <h1 className="text-xl font-bold">{t("select.chooseTitle")}</h1>
        <p className="text-sm text-white/85">{t("select.chooseSubtitle")}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <CharacterGrid characters={state.characters} selectedId={pending} onSelect={setPending} />
      </div>

      <div className="glass-card shrink-0 rounded-2xl bg-surface2 ">
        <Button onClick={confirm} disabled={!pending || disabled}>
          {t("select.confirm")}
        </Button>
      </div>
    </main>
  );
}
