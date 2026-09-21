import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // surface/surface2/cardBg hold raw "R G B" channel numbers (not
        // hex) specifically so Tailwind's alpha modifier works on them
        // (bg-surface/60 etc.) — that's what makes the glassmorphism cards
        // possible without a bespoke class per component. See globals.css.
        bg: "var(--color-bg)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        surface2: "rgb(var(--color-surface-2) / <alpha-value>)",
        primary: "var(--color-primary)",
        primaryDark: "var(--color-primary-dark)",
        primaryInk: "var(--color-primary-ink)",
        secondary: "var(--color-secondary)",
        navy: "var(--color-navy)",
        accent: "var(--color-accent)",
        danger: "var(--color-danger)",
        success: "var(--color-success)",
        textPrimary: "var(--color-text-primary)",
        textMuted: "var(--color-text-muted)",
        onGradient: "var(--color-on-gradient)",
      },
      backgroundImage: {
        "app-gradient": "var(--gradient-bg)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pop-in": "pop-in 0.18s ease-out",
        "shake": "shake 0.4s ease-in-out",
      },
      keyframes: {
        "pop-in": {
          "0%": { transform: "scale(0.85)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-4px)" },
          "75%": { transform: "translateX(4px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
