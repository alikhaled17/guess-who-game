import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "خمّن شخصيتي — Guess Who",
  description: "لعبة تخمين شخصيات ثنائية اللاعبين، تعمل مباشرة بين جهازين عبر WebRTC.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "خمّن شخصيتي",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#F15A24",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Default lang/dir for the initial SSR paint — LanguageProvider
    // corrects these on mount if the visitor previously chose English
    // (persisted client-side; there's no cookie/SSR-aware locale here, so
    // a returning English user may see a brief Arabic/RTL flash before it
    // switches, which is an accepted tradeoff for a no-account app).
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="min-h-dvh antialiased">
        <LanguageProvider>
          <ServiceWorkerRegister />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
