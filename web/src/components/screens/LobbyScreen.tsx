"use client";

import { useState } from "react";
import type { PlayerId } from "@/game/types";
import type { ConnectionStatus } from "@/networking/connection/connectionManager";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { Button } from "@/components/Button";
import { shareInvite } from "@/lib/share";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

interface LobbyScreenProps {
  role: PlayerId;
  gameId: string;
  status: ConnectionStatus;
  onReconnect: () => void;
}

export function LobbyScreen({ role, gameId, status, onReconnect }: LobbyScreenProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const result = await shareInvite(gameId, t("lobby.shareText"));
    if (result.method === "clipboard" && result.ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <main className="safe-x flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10 text-center">
      {role === "host" ? (
        <>
          <h1 className="text-2xl font-extrabold">{t("lobby.shareTitle")}</h1>
          <p className="max-w-xs text-white/85">{t("lobby.shareSubtitle")}</p>
          <div className="w-full max-w-sm space-y-3">
            <Button onClick={handleShare}>{t("lobby.shareButton")}</Button>
            {copied && <p className="text-sm text-success">{t("lobby.linkCopied")}</p>}
          </div>
          <p className="text-white/85">{t("lobby.waitingForPlayer")}</p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-extrabold">{t("lobby.connectingTitle")}</h1>
          <p className="max-w-xs text-white/85">{t("lobby.connectingSubtitle")}</p>
        </>
      )}

      <ConnectionBadge status={status} />

      {(status === "failed" || status === "disconnected") && (
        <div className="w-full max-w-sm">
          <Button variant="secondary" onClick={onReconnect}>
            {t("common.retry")}
          </Button>
        </div>
      )}
    </main>
  );
}
