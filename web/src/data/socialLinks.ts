/**
 * An empty href renders that item as a disabled "coming soon" placeholder
 * on the support page (src/app/support/page.tsx) instead of a dead link.
 */
export interface SocialLink {
  label: string;
  href: string;
  icon: string;
}

export const GAME_SOCIAL_LINKS: SocialLink[] = [
  { label: "YouTube", href: "https://www.youtube.com/@alikhaled1x", icon: "📺" },
  { label: "Instagram", href: "https://www.instagram.com/alikhaled17/", icon: "📷" },
  { label: "TikTok", href: "https://www.tiktok.com/@ali.khaled1x", icon: "🎵" },
];

export const DEVELOPER_LINKS: SocialLink[] = [
  { label: "GitHub", href: "https://github.com/alikhaled17", icon: "💻" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/ali-khaled-7a4a981b4/", icon: "💼" },
  { label: "Ali Khaled", href: "https://alikhaled.vercel.app/", icon: "🌐" },
];
