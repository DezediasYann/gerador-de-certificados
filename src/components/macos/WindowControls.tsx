"use client";
import { useEffect, useState } from "react";
import { isTauri } from "@/lib/tauri/TauriBridge";
import { TrafficLights } from "./TrafficLights";
import { Minus, Square, X, Copy } from "lucide-react";

type Platform = "macos" | "windows" | "linux" | "web";

/** Detecta a plataforma atual (no Tauri via userAgent, no browser = web). */
function detectPlatform(): Platform {
  if (typeof window === "undefined") return "web";
  if (!isTauri()) return "web";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "macos";
  if (ua.includes("win")) return "windows";
  return "linux";
}

/**
 * Controles de janela sensíveis à plataforma.
 * - macOS: semáforos (traffic lights) no canto esquerdo — `side="left"` os renderiza.
 * - Windows/Linux: controles nativos (minimizar / maximizar / fechar) no canto direito — `side="right"` os renderiza.
 * - Browser (dev): não renderiza nada (o browser tem seu próprio chrome).
 *
 * Coloque `<WindowControls side="left" />` no início do header e
 * `<WindowControls side="right" />` no final — cada um renderiza só o que
 * faz sentido para a plataforma atual.
 */
export function WindowControls({ side }: { side: "left" | "right" }) {
  const [platform, setPlatform] = useState<Platform>("web");
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        setMaximized(await win.isMaximized());
        const fn = await win.onResized(async () => {
          setMaximized(await win.isMaximized());
        });
        unlisten = fn;
      } catch (err) {
        console.warn("WindowControls: Tauri window API indisponível:", err);
      }
    })();
    return () => {
      unlisten?.();
    };
  }, []);

  // macOS: semáforos à esquerda, nada à direita
  if (platform === "macos") {
    return side === "left" ? <TrafficLights /> : null;
  }
  // Windows/Linux: nada à esquerda, controles à direita
  if (platform === "windows" || platform === "linux") {
    if (side === "left") return null;
    return <WindowsControls maximized={maximized} />;
  }
  // Browser (dev): não renderiza nada
  return null;
}

/** Controles de janela estilo Windows (─ ▢ ✕). */
function WindowsControls({ maximized }: { maximized: boolean }) {
  const action = async (fn: "minimize" | "toggleMaximize" | "close") => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      if (fn === "minimize") await win.minimize();
      else if (fn === "toggleMaximize") await win.toggleMaximize();
      else await win.close();
    } catch (err) {
      console.error("WindowControls: erro ao controlar janela:", err);
    }
  };

  return (
    <div className="no-drag -mr-3 -mt-1 flex h-9 items-center">
      <button
        type="button"
        aria-label="Minimizar"
        onClick={() => action("minimize")}
        className="flex h-9 w-12 items-center justify-center text-foreground/70 transition-colors hover:bg-foreground/10"
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <button
        type="button"
        aria-label={maximized ? "Restaurar" : "Maximizar"}
        onClick={() => action("toggleMaximize")}
        className="flex h-9 w-12 items-center justify-center text-foreground/70 transition-colors hover:bg-foreground/10"
      >
        {maximized ? (
          <Copy className="h-3 w-3 rotate-180" strokeWidth={2} />
        ) : (
          <Square className="h-3 w-3" strokeWidth={2} />
        )}
      </button>
      <button
        type="button"
        aria-label="Fechar"
        onClick={() => action("close")}
        className="flex h-9 w-12 items-center justify-center text-foreground/70 transition-colors hover:bg-[#e81123] hover:text-white"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
