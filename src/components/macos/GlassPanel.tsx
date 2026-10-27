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
        "rounded-2xl shadow-[0_4px_30px_-8px_rgba(0,0,0,0.12)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
