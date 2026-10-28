"use client";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Painel de vidro translúcido estilo macOS Golden Gate (Liquid Glass). */
export function GlassPanel({
  children,
  className,
  strong = false,
}: {
  children: ReactNode;
  className?: string;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        strong ? "glass-strong" : "glass",
        // `relative` é necessário aqui pois .glass/.glass-strong não definem position
        // (para não sobrescrever `fixed`/`sticky` em dialogs e header). O ::before
        // fallback do glass ancora neste elemento posicionado.
        "relative",
        "rounded-2xl shadow-[0_4px_30px_-8px_rgba(0,0,0,0.12)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
