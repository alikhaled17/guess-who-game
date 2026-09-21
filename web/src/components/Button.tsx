"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  // text-primaryInk (navy), not white — white-on-orange is only ~3.4:1 (AA
  // large-text minimum); navy-on-orange is ~4.2:1, closer to full AA.
  primary:
    "bg-primary hover:bg-primaryDark active:scale-[0.98] text-primaryInk border-[3px] border-navy shadow-[0_6px_0_0_theme(colors.navy),0_10px_20px_-4px_rgb(30_30_56/0.35)] active:shadow-[0_2px_0_0_theme(colors.navy)] active:translate-y-[3px]",
  secondary: "bg-surface2 hover:bg-surface2/80 active:scale-[0.98] text-textPrimary border-[3px] border-navy shadow-lg shadow-navy/10",
  danger:
    "bg-danger hover:bg-danger/90 active:scale-[0.98] text-white border-[3px] border-navy shadow-[0_6px_0_0_theme(colors.navy)] active:shadow-[0_2px_0_0_theme(colors.navy)] active:translate-y-[3px]",
  ghost: "bg-white/20 backdrop-blur-sm border-[3px] border-navy/70 hover:bg-white/30 active:scale-[0.98] text-navy",
};

export function Button({ variant = "primary", fullWidth = true, className = "", children, ...rest }: ButtonProps) {
  return (
    <button
      className={`${fullWidth ? "w-full" : ""} min-h-[52px] rounded-2xl px-6 py-3 text-lg font-bold
        transition-all disabled:opacity-40 disabled:pointer-events-none select-none
        ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
