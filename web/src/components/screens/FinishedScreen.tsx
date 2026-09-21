"use client";

import type { GameState } from "@/game/types";
import { otherPlayer } from "@/game/types";
import { getCharacterById } from "@/data/characters";
import { Button } from "@/components/Button";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

interface FinishedScreenProps {
  state: GameState;
  onRestart: () => void;
  /** True while the WebRTC connection isn't fully live yet (e.g. still re-handshaking after a refresh). */
  disabled?: boolean;
}

export function FinishedScreen({ state, onRestart, disabled = false }: FinishedScreenProps) {
  const { t } = useTranslation();
  const local = state.localPlayerId;
  const opponent = otherPlayer(local);
  const won = state.winner === local;
  const opponentName = state.players[opponent].name || t("common.friend");

  const opponentReveal = state.reveals.find((r) => r.playerId === opponent);
  const opponentCharacter = opponentReveal ? getCharacterById(opponentReveal.characterId) : null;

  const reasonText = {
    "correct-guess": won
      ? t("finished.reasonCorrectGuessWon")
      : t("finished.reasonCorrectGuessLost", { name: opponentName }),
    "wrong-guess": won
      ? t("finished.reasonWrongGuessWon", { name: opponentName })
      : t("finished.reasonWrongGuessLost"),
    "opponent-left": t("finished.reasonOpponentLeft"),
  }[state.gameOverReason ?? "wrong-guess"];

  return (
    <main className="safe-x flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <div className="text-7xl">{won ? "🏆" : "😅"}</div>
      <h1 className="text-3xl font-extrabold">{won ? t("finished.won") : t("finished.lost")}</h1>
      <p className="text-white/85">{reasonText}</p>

      {opponentCharacter && (
        <div className="glass-card flex flex-col items-center gap-2 rounded-3xl bg-surface px-6 py-4">
          <p className="text-sm text-textMuted">{t("finished.secretWas", { name: opponentName })}</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- small local static asset */}
          <img src={opponentCharacter.image} alt="" className="h-24 w-24 rounded-full object-cover" />
          <p className="font-bold">{opponentCharacter.name}</p>
        </div>
      )}

      <div className="w-full max-w-sm space-y-3">
        <Button onClick={onRestart} disabled={disabled}>
          {t("finished.playAgain")}
        </Button>
      </div>
    </main>
  );
}
