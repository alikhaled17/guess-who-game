"use client";

import Link from "next/link";
import { LanguageToggle } from "@/components/LanguageToggle";
import { GAME_SOCIAL_LINKS, DEVELOPER_LINKS, type SocialLink } from "@/data/socialLinks";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

function LinkRow({ link }: { link: SocialLink }) {
  const { t } = useTranslation();
  const disabled = !link.href;

  const content = (
    <>
      <span className="text-xl">{link.icon}</span>
      <span className="flex-1 text-start font-bold text-textPrimary">{link.label}</span>
      {disabled && <span className="text-xs text-textMuted">{t("support.comingSoon")}</span>}
    </>
  );

  const rowClasses = "flex items-center gap-3 rounded-2xl border-2 border-navy/15 bg-surface px-4 py-3";

  if (disabled) {
    return <div className={`${rowClasses} opacity-50`}>{content}</div>;
  }
  return (
    <a href={link.href} target="_blank" rel="noopener noreferrer" className={`${rowClasses} active:scale-[0.98]`}>
      {content}
    </a>
  );
}

export default function SupportPage() {
  const { t } = useTranslation();

  return (
    <main className="safe-x flex min-h-dvh flex-col items-center gap-8 px-4 py-10 text-center">
      <div className="fixed right-4 top-4 z-30" style={{ top: "max(1rem, env(safe-area-inset-top))" }}>
        <LanguageToggle />
      </div>

      <div className="mt-8 flex flex-col items-center gap-2">
        <h1 className="text-2xl font-extrabold">{t("support.title")}</h1>
        <p className="max-w-xs text-white/85">{t("support.subtitle")}</p>
      </div>

      <div className="w-full max-w-sm space-y-6">
        <section className="space-y-2">
          <h2 className="text-start text-sm font-bold text-white/85">{t("support.followUs")}</h2>
          <div className="space-y-2">
            {GAME_SOCIAL_LINKS.map((link) => (
              <LinkRow key={link.label} link={link} />
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-start text-sm font-bold text-white/85">{t("support.aboutDeveloper")}</h2>
          <div className="space-y-2">
            {DEVELOPER_LINKS.map((link) => (
              <LinkRow key={link.label} link={link} />
            ))}
          </div>
        </section>

        <Link
          href="/"
          className="block w-full rounded-2xl border-2 border-navy/40 bg-surface2 px-6 py-3 text-sm font-bold text-textMuted"
        >
          {t("support.back")}
        </Link>
      </div>
    </main>
  );
}
