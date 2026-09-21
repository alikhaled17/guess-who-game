"use client";

import { useState } from "react";
import type { GameState } from "@/game/types";
import { otherPlayer } from "@/game/types";
import { getCharacterById } from "@/data/characters";
import { CharacterGrid } from "@/components/CharacterGrid";
import { Button } from "@/components/Button";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

interface PlayingScreenProps {
  state: GameState;
  onEndTurn: () => void;
  onEliminate: (characterId: string) => void;
  onRestore: (characterId: string) => void;
  onGuess: (characterId: string) => void;
  /**
   * True while the WebRTC connection isn't fully live yet (e.g. still
   * re-handshaking after a refresh — see game/[gameId]/page.tsx). Gates
   * only the two actions that actually cross the network (END_TURN,
   * GUESS_CHARACTER); eliminate/restore stay enabled since they're purely
   * local bookkeeping that's never sent anywhere.
   */
  disabled?: boolean;
}

export function PlayingScreen({
  state,
  onEndTurn,
  onEliminate,
  onRestore,
  onGuess,
  disabled = false,
}: PlayingScreenProps) {
  const { t } = useTranslation();
  const [guessMode, setGuessMode] = useState(false);
  const [confirmGuessId, setConfirmGuessId] = useState<string | null>(null);
  // Eliminations locked in from PAST turns — can no longer be undone. Purely
  // a local UI/UX rule (never networked, never part of GameState): snapshot
  // taken the moment THIS player ends their own turn, so anything crossed
  // off during their NEXT turn stays undoable until they end that turn too.
  const [lockedEliminations, setLockedEliminations] = useState<string[]>([]);
  // Brief, self-clearing hint shown when a player tries to eliminate their
  // last remaining character — always keep at least one on the board,
  // otherwise there'd be nothing left to eventually guess correctly.
  const [showMustKeepOneHint, setShowMustKeepOneHint] = useState(false);

  const local = state.localPlayerId;
  const opponent = otherPlayer(local);
  const myTurn = state.currentTurn === local;
  const opponentName = state.players[opponent].name || t("common.friend");
  const isResolvingGuess = state.pendingGuess !== null;

  function handleGridTap(characterId: string) {
    const eliminated = state.eliminatedByLocalPlayer.includes(characterId);
    if (guessMode) {
      // Can't guess a character you've already crossed off your own board.
      if (eliminated) return;
      setConfirmGuessId(characterId);
      return;
    }
    if (eliminated) {
      // Can't undo an elimination that's locked in from a previous turn.
      if (lockedEliminations.includes(characterId)) return;
      onRestore(characterId);
    } else {
      // Never let the board go to zero — always keep at least one character.
      const remainingNow = state.characters.length - state.eliminatedByLocalPlayer.length;
      if (remainingNow <= 1) {
        setShowMustKeepOneHint(true);
        setTimeout(() => setShowMustKeepOneHint(false), 2200);
        return;
      }
      onEliminate(characterId);
    }
  }

  function handleEndTurn() {
    setLockedEliminations(state.eliminatedByLocalPlayer);
    onEndTurn();
  }

  const remaining = state.characters.length - state.eliminatedByLocalPlayer.length;
  const confirmCharacter = confirmGuessId ? state.characters.find((c) => c.id === confirmGuessId) : null;
  const mySecretCharacter = state.localSecret ? getCharacterById(state.localSecret.characterId) : null;

  return (
    // h-dvh (fixed, not min-h-dvh) + overflow-hidden here is what makes the
    // page itself never scroll — only the character grid below does (it's
    // the one flex child with min-h-0 + overflow-y-auto). Everything else
    // (secret badge, header, instructions, action buttons) stays put.
    <main className="safe-x flex h-dvh flex-col gap-3 overflow-hidden px-3 py-4">
      {/* Fixed in place for the whole "playing" screen (never scrolls away)
          so a player can always glance back at which character they
          secretly picked — see game/types' localSecret. */}
      {mySecretCharacter && (
        <div
          className="glass-card fixed left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-surface2 py-1 pe-3 ps-1 shadow-md shadow-navy/15"
          style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- small local static asset */}
          <img
            src={mySecretCharacter.image}
            alt=""
            className="h-9 w-9 rounded-full border-2 border-navy object-cover"
          />
          <span className="text-xs font-bold text-textMuted">
            {t("playing.mySecretLabel")} <span className="text-textPrimary">{mySecretCharacter.name}</span>
          </span>
        </div>
      )}

      <header className="glass-card mt-12 flex shrink-0 items-center justify-between rounded-2xl bg-surface px-4 py-3">
        <span className="font-bold text-sm text-center">{state.players[local].name || t("common.you")}</span>
        <span
          className={`rounded-full px-3 py-1 text-sm text-center font-bold ${
            myTurn ? "bg-primary text-primaryInk" : "bg-surface2 text-textMuted"
          }`}
        >
          {myTurn ? t("playing.yourTurn") : t("playing.opponentTurn", { name: opponentName })}
        </span>
        <span className="text-textMuted text-sm text-center">{opponentName}</span>
      </header>

      <div className="glass-card shrink-0 rounded-2xl bg-surface2 px-4 py-3 text-center text-sm text-textMuted">
        {myTurn
          ? t("playing.instructionMyTurn")
          : t("playing.instructionOpponentTurn", { name: opponentName })}
      </div>

      <div className="glass-card min-h-0 flex-1 overflow-y-auto rounded-2xl bg-surface/70 p-2">
        <div className="mb-2 flex items-center justify-between px-1 text-xs text-textMuted">
          <span>{t("playing.boardRemaining", { remaining })}</span>
          {guessMode && <span className="font-bold text-accent">{t("playing.guessModeOn")}</span>}
        </div>
        {showMustKeepOneHint && (
          <p className="mb-2 rounded-xl border-2 border-danger bg-danger/15 px-3 py-2 text-center text-xs font-bold text-danger">
            {t("playing.mustKeepOne")}
          </p>
        )}
        <CharacterGrid
          characters={state.characters}
          eliminatedIds={state.eliminatedByLocalPlayer}
          lockedIds={lockedEliminations}
          onSelect={handleGridTap}
        />
      </div>

      <div className="shrink-0 space-y-2">
        {isResolvingGuess && (
          <p className="text-center text-white/85">
            {state.pendingGuess?.guessedBy === local
              ? t("playing.waitingForGuessConfirm")
              : t("playing.confirmingGuess")}
          </p>
        )}

        {myTurn && !isResolvingGuess && !guessMode && (
          <>
            <Button onClick={handleEndTurn} disabled={disabled}>
              {t("playing.endTurn")}
            </Button>
            <Button variant="danger" onClick={() => setGuessMode(true)} disabled={disabled}>
              {t("playing.guessNow")}
            </Button>
          </>
        )}

        {myTurn && !isResolvingGuess && guessMode && (
          <Button variant="ghost" onClick={() => setGuessMode(false)}>
            {t("playing.cancelGuessMode")}
          </Button>
        )}
      </div>

      {confirmCharacter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 px-6">
          <div className="glass-card w-full max-w-sm space-y-4 rounded-3xl bg-surface p-6 text-center">
            <p className="text-lg">{t("playing.confirmGuessQuestion", { name: confirmCharacter.name })}</p>
            <p className="text-sm text-danger">{t("playing.wrongGuessWarning")}</p>
            <div className="flex gap-2">
              <Button
                variant="danger"
                disabled={disabled}
                onClick={() => {
                  onGuess(confirmCharacter.id);
                  setConfirmGuessId(null);
                  setGuessMode(false);
                }}
              >
                {t("playing.yesGuess")}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmGuessId(null)}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
