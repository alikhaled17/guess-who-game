"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { PlayerId } from "@/game/types";
import { useGameSession } from "@/hooks/useGameSession";
import { useLocalPlayerName } from "@/hooks/useLocalPlayerName";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { Button } from "@/components/Button";
import { LeaveGameButton } from "@/components/LeaveGameButton";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { LobbyScreen } from "@/components/screens/LobbyScreen";
import { ConnectedScreen } from "@/components/screens/ConnectedScreen";
import { CharacterSelectScreen } from "@/components/screens/CharacterSelectScreen";
import { PlayingScreen } from "@/components/screens/PlayingScreen";
import { FinishedScreen } from "@/components/screens/FinishedScreen";

/**
 * gameId comes from the real browser URL, not Next's route `params` — this
 * page is statically exported as a single placeholder file
 * (game/[gameId]/page.tsx's generateStaticParams) and served for ANY
 * /game/<id> path via Cloudflare Pages' _redirects proxy rule (see
 * public/_redirects). usePathname() reflects the actual address bar, so
 * this still resolves to the real id the player was sent.
 */
function gameIdFromPathname(pathname: string): string {
  const match = pathname.match(/\/game\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function resolveRole(gameId: string): PlayerId {
  try {
    const stored = window.sessionStorage.getItem(`guesswho:role:${gameId}`);
    if (stored === "host" || stored === "guest") return stored;
  } catch {
    /* sessionStorage unavailable */
  }
  return "guest"; // safest default: only the create-flow explicitly marks a tab as "host"
}

export function GameClientPage() {
  const pathname = usePathname();
  const gameId = gameIdFromPathname(pathname);
  const [role, setRole] = useState<PlayerId | null>(null);
  const [localName, setLocalName] = useLocalPlayerName();

  useEffect(() => {
    setRole(resolveRole(gameId));
  }, [gameId]);

  if (!gameId || !role || !localName) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <ConnectionBadge status="idle" />
      </main>
    );
  }

  return <GameSessionView gameId={gameId} role={role} localName={localName} onPersistName={setLocalName} />;
}

function GameSessionView({
  gameId,
  role,
  localName,
  onPersistName,
}: {
  gameId: string;
  role: PlayerId;
  localName: string;
  /** Also saves the corrected name to this device's default for future games — see hooks/useLocalPlayerName.ts. */
  onPersistName: (name: string) => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { state, status, actions } = useGameSession({ gameId, role, localName });

  function handleRename(name: string) {
    actions.setName(name);
    onPersistName(name);
  }

  function handleBackToHome() {
    actions.leaveGame();
    try {
      window.sessionStorage.removeItem(`guesswho:role:${gameId}`);
    } catch {
      /* non-fatal */
    }
    router.push("/");
  }
  // Covers "connecting" too, not just reconnecting/disconnected/failed —
  // that matters specifically for a session RESUMED from a refresh
  // (state.status !== "idle"): the screen shows the restored game
  // immediately, but the actual WebRTC handshake still has to redo itself
  // from scratch and can take several seconds. Without this, a player
  // could tap an action button while the channel is still closed and the
  // message would silently never reach the other side.
  const showReconnectBanner = state.status !== "idle" && status !== "connected" && status !== "closed";
  const networkReady = status === "connected";

  return (
    <>
      <LeaveGameButton gameId={gameId} onLeave={actions.leaveGame} />
      <LanguageToggle fixed />

      {showReconnectBanner && (
        <div className="safe-x fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-2 border-b-[3px] border-navy bg-surface2 px-4 py-2 shadow-lg">
          <ConnectionBadge status={status} />
          <div className="flex items-center gap-2">
            {status === "failed" && (
              <Button
                variant="secondary"
                fullWidth={false}
                onClick={actions.reconnect}
                className="px-4 py-2 text-sm"
              >
                {t("common.retry")}
              </Button>
            )}
            {/* Available the whole time the connection isn't live — not just
                once it's given up — so a player isn't stuck waiting if they'd
                rather just leave. */}
            <Button variant="ghost" fullWidth={false} onClick={handleBackToHome} className="px-4 py-2 text-sm">
              {t("common.backToHome")}
            </Button>
          </div>
        </div>
      )}

      {state.status === "idle" && (
        <LobbyScreen role={role} gameId={gameId} status={status} onReconnect={actions.reconnect} />
      )}

      {state.status === "lobby" && (
        <ConnectedScreen
          state={state}
          onReady={actions.setReady}
          onSetDifficulty={actions.setDifficulty}
          onRename={handleRename}
          disabled={!networkReady}
        />
      )}

      {state.status === "selecting" && (
        <CharacterSelectScreen state={state} onSelect={actions.selectCharacter} disabled={!networkReady} />
      )}

      {state.status === "playing" && (
        <PlayingScreen
          state={state}
          onEndTurn={actions.endTurn}
          onEliminate={actions.eliminateCharacter}
          onRestore={actions.restoreCharacter}
          onGuess={actions.guessCharacter}
          disabled={!networkReady}
        />
      )}

      {state.status === "finished" && (
        <FinishedScreen state={state} onRestart={actions.restart} disabled={!networkReady} />
      )}
    </>
  );
}
