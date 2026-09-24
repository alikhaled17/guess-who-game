"use client";

import type { Character } from "@/game/types";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

interface CharacterGridProps {
  characters: Character[];
  /** ids that should render as blurred/crossed-out (eliminated from your own deduction board) */
  eliminatedIds?: string[];
  /**
   * Eliminated ids that can no longer be un-eliminated (locked in from a
   * PAST turn — see PlayingScreen's turn-lock logic). Shown with a small
   * lock badge so it's clear why tapping does nothing, rather than just
   * silently failing.
   */
  lockedIds?: string[];
  /** id that should render as highlighted/selected */
  selectedId?: string | null;
  disabled?: boolean;
  onSelect?: (characterId: string) => void;
  onLongPress?: (characterId: string) => void;
}

export function CharacterGrid({
  characters,
  eliminatedIds = [],
  lockedIds = [],
  selectedId = null,
  disabled = false,
  onSelect,
}: CharacterGridProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 lg:grid-cols-10">
      {characters.map((c) => {
        const eliminated = eliminatedIds.includes(c.id);
        const locked = lockedIds.includes(c.id);
        const selected = selectedId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            disabled={disabled}
            aria-label={`${t("common.characterAriaPrefix")}: ${c.name}${eliminated ? ` ${t("common.eliminatedSuffix")}` : ""}${locked ? ` ${t("common.lockedSuffix")}` : ""}`}
            onClick={() => onSelect?.(c.id)}
            className={[
              // NOT aspect-square on the button itself — that forces a
              // fixed square height, and since the portrait image alone
              // (aspect-square, w-full) already fills nearly all of it,
              // flexbox was compressing the name label below to 0px
              // height (overflow-hidden clipped it entirely, invisible
              // even though the text was genuinely in the DOM). Letting
              // the button's height be auto (image + label + padding)
              // fixes that; the grid's equal column widths keep every
              // cell visually uniform anyway.
              "relative flex flex-col items-center rounded-xl border-2 p-1 pb-1.5 transition-all",
              "min-h-[64px] active:scale-95",
              selected
                ? "border-primary bg-primary/20 shadow-lg shadow-primary/30"
                : "border-navy/15 bg-surface hover:border-navy/30",
              disabled ? "pointer-events-none" : "",
            ].join(" ")}
          >
            {/*
              eslint-disable-next-line @next/next/no-img-element --
              small local static assets (~5KB each, ~150KB for all 30 —
              see data/characters.ts); eager-loaded on purpose so a player
              scrolling their own selection/elimination board never sees
              placeholder pop-in on a screen whose whole point is visually
              comparing characters at a glance.
            */}
            <img
              src={c.image}
              alt=""
              draggable={false}
              className={`aspect-square w-full shrink-0 rounded-full object-cover transition-all ${
                eliminated ? "opacity-40 blur-[3px] saturate-50" : ""
              }`}
            />
            <span className="mt-1 w-full shrink-0 truncate text-center text-[10px] leading-tight text-textMuted sm:text-xs">
              {c.name}
            </span>
            {eliminated && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="h-[2px] w-3/4 rotate-45 bg-danger" />
              </span>
            )}
            {locked && (
              <span className="pointer-events-none absolute end-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-navy text-[8px]">
                🔒
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
