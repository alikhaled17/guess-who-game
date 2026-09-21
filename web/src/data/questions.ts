/**
 * Purely local reference list — powers ONE thing:
 * `components/SuggestedQuestions.tsx`, a "need inspiration?" list a player
 * can glance at. Not tied to character data, not sent over the network,
 * not checked against anything — see CLAUDE.md "Why question/answer is
 * verbal, not networked".
 *
 * Each entry is an i18n key suffix — the display text lives in
 * `lib/i18n/translations.ts`'s `questions.*` (looked up as
 * `t(\`questions.${id}\`)`), not here, so it follows the player's chosen
 * language.
 */
export const QUESTIONS: string[] = [
  "hasGlasses",
  "hasHat",
  "hasBeard",
  "hasMustache",
  "hasEarrings",
  "isSmiling",
  "isMale",
  "isFemale",
  "hairBlack",
  "hairBrown",
  "hairBlonde",
  "hairRed",
  "hairGray",
  "hairNone",
  "skinLight",
  "skinMedium",
  "skinDark",
];
