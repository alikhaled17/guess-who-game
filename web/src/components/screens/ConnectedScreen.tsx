"use client";

import { useState } from "react";
import type { DifficultyLevel, GameState } from "@/game/types";
import { otherPlayer } from "@/game/types";
import { Button } from "@/components/Button";
import { DIFFICULTY_LEVELS, characterCountForDifficulty } from "@/data/difficulty";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

interface ConnectedScreenProps {
  state: GameState;
  onReady: () => void;
  onSetDifficulty: (level: DifficultyLevel) => void;
  /** Edits the local player's own display name — see hooks/useGameSession.ts's setName. */
  onRename: (name: string) => void;
  /** True while the WebRTC connection isn't fully live yet (e.g. still re-handshaking after a refresh). */
  disabled?: boolean;
}

export function ConnectedScreen({ state, onReady, onSetDifficulty, onRename, disabled = false }: ConnectedScreenProps) {
  const { t } = useTranslation();
  const me = state.players[state.localPlayerId];
  const opponent = state.players[otherPlayer(state.localPlayerId)];
  const isHost = state.localPlayerId === "host";
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(me.name);

  function commitRename() {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== me.name) onRename(trimmed);
    setEditingName(false);
  }

  function startEditing() {
    setDraftName(me.name);
    setEditingName(true);
  }

  return (
    <main className="safe-x flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10 text-center">
      <p className="text-2xl">{t("connected.connected")}</p>

      <div className="flex items-center justify-center gap-6 text-xl font-bold">
        {editingName ? (
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setEditingName(false);
            }}
            maxLength={24}
            className="w-32 rounded-xl border-2 border-navy bg-surface2 px-2 py-1 text-center text-base text-textPrimary outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={startEditing}
            className="inline-flex items-center gap-1 rounded-lg px-1 transition-colors hover:bg-white/10 active:scale-95"
            aria-label={t("connected.editName")}
          >
            <span>{me.name || t("common.you")}</span>
            <span className="text-xs opacity-70">✏️</span>
          </button>
        )}
        <span className="text-white/70">VS</span>
        <span>{opponent.name || "..."}</span>
      </div>

      <div className="w-full max-w-sm space-y-2">
        <p className="text-sm text-textMuted">
          {isHost ? t("connected.chooseDifficulty") : t("connected.hostChoseDifficulty")}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {DIFFICULTY_LEVELS.map((level) => {
            const selected = state.difficulty === level;
            const canChange = isHost && !me.ready && !disabled;
            return (
              <button
                key={level}
                type="button"
                disabled={!canChange}
                onClick={() => onSetDifficulty(level)}
                className={[
                  "rounded-2xl border-2 px-2 py-3 text-sm font-bold transition-all active:scale-95",
                  selected
                    ? "border-primary bg-primary/20 text-textPrimary"
                    : "border-navy/15 bg-surface text-textMuted",
                  !canChange ? "pointer-events-none" : "",
                ].join(" ")}
              >
                <div>{t(`difficulty.${level}`)}</div>
                <div className="text-xs font-normal opacity-70">
                  {t("connected.charactersCount", { count: characterCountForDifficulty(level) })}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {opponent.ready && !me.ready && <p className="text-sm font-bold text-green-700">{t("connected.friendReady")}</p>}
      {me.ready && !opponent.ready && (
        <p className="text-sm text-white/85">{t("connected.waitingForFriendReady")}</p>
      )}

      <div className="w-full max-w-sm">
        <Button onClick={onReady} disabled={me.ready || disabled}>
          {me.ready ? t("connected.waitingForFriend") : t("connected.startPlaying")}
        </Button>
      </div>
    </main>
  );
}
