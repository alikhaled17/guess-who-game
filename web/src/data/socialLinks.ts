/**
 * Fill these in once the real accounts/pages exist — an empty string
 * renders that item as a disabled placeholder on the support page
 * (src/app/support/page.tsx) instead of a dead link, so this file is
 * safe to ship before every link is ready.
 */
export interface SocialLink {
  label: string;
  href: string;
  icon: string;
}

export const GAME_SOCIAL_LINKS: SocialLink[] = [
  { label: "YouTube", href: "", icon: "📺" },
  { label: "Instagram", href: "", icon: "📷" },
  { label: "TikTok", href: "", icon: "🎵" },
];

export const DEVELOPER_LINKS: SocialLink[] = [
  { label: "GitHub", href: "", icon: "💻" },
  { label: "LinkedIn", href: "", icon: "💼" },
  { label: "Ali Khaled", href: "", icon: "🌐" },
];
