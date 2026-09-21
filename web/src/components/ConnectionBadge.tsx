"use client";

import type { ConnectionStatus } from "@/networking/connection/connectionManager";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

const DOT_CLASSES: Record<ConnectionStatus, { dot: string; pulse?: boolean }> = {
  idle: { dot: "bg-textMuted" },
  connecting: { dot: "bg-accent", pulse: true },
  connected: { dot: "bg-success" },
  reconnecting: { dot: "bg-accent", pulse: true },
  disconnected: { dot: "bg-danger" },
  failed: { dot: "bg-danger" },
  closed: { dot: "bg-textMuted" },
};

export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const { t } = useTranslation();
  const cfg = DOT_CLASSES[status];
  return (
    <div className="inline-flex items-center gap-2 rounded-full border-2 border-navy bg-surface px-4 py-2 text-sm text-textMuted shadow-md shadow-navy/10">
      <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot} ${cfg.pulse ? "animate-pulse-slow" : ""}`} />
      <span>{t(`connectionStatus.${status}`)}</span>
    </div>
  );
}
