"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { NameInput } from "@/components/NameInput";
import { LanguageToggle } from "@/components/LanguageToggle";
import { randomDefaultName, useLocalPlayerName } from "@/hooks/useLocalPlayerName";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

/**
 * gameId comes from the real browser URL, not Next's route `params` — this
 * page is statically exported as a single placeholder file
 * (join/[gameId]/page.tsx's generateStaticParams) and served for ANY
 * /join/<id> path via Cloudflare Pages' _redirects proxy rule (see
 * public/_redirects). usePathname() reflects the actual address bar, so
 * this still resolves to the real id the player was sent.
 */
function gameIdFromPathname(pathname: string): string {
  const match = pathname.match(/\/join\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export function JoinClientPage() {
  const router = useRouter();
  const pathname = usePathname();
  const gameId = gameIdFromPathname(pathname);
  const { t, lang } = useTranslation();
  const [name, setName] = useLocalPlayerName();

  function handleJoin() {
    if (!name.trim()) setName(randomDefaultName(lang));
    try {
      window.sessionStorage.setItem(`guesswho:role:${gameId}`, "guest");
    } catch {
      /* non-fatal — the game page defaults unknown visitors to guest */
    }
    router.push(`/game/${gameId}`);
  }

  return (
    <main className="safe-x flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10 text-center">
      <div className="fixed right-4 top-4 z-30" style={{ top: "max(1rem, env(safe-area-inset-top))" }}>
        <LanguageToggle />
      </div>

      <div className="text-6xl">🎮</div>
      <h1 className="text-2xl font-extrabold">{t("join.title")}</h1>
      <p className="max-w-xs text-white/85">{t("join.subtitle")}</p>
      <div className="w-full max-w-sm space-y-4">
        <NameInput value={name} onChange={setName} />
        <Button onClick={handleJoin}>{t("common.join")}</Button>
      </div>
    </main>
  );
}
