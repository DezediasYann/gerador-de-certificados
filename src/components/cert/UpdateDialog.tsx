"use client";
import { useEffect, useRef, useState } from "react";
import { UpdateChecker } from "@/lib/updater/UpdateChecker";
import { useEventStore } from "@/store/event-store";
import { APP_VERSION } from "@/lib/cert/Catalogs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Download,
  Loader2,
  Sparkles,
  Check,
  X,
  ArrowRight,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { isTauri } from "@/lib/tauri/TauriBridge";
import type { UpdateInfo } from "@/lib/cert/types";

type Phase = "checking" | "available" | "downloading" | "installing" | "done" | "error";

interface DownloadStats {
  loaded: number;       // bytes baixados
  total: number;        // bytes totais (0 se desconhecido)
  speed: number;        // bytes/segundo
  percent: number;      // 0-100
}

/** Verifica atualização ao montar e exibe o modal hero se houver. */
export function UpdateCheckerDialog() {
  const betaUpdates = useEventStore((s) => s.betaUpdates);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [phase, setPhase] = useState<Phase>("checking");
  const [stats, setStats] = useState<DownloadStats | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const checker = new UpdateChecker(undefined, APP_VERSION);
      const info = await checker.check(betaUpdates);
      if (!cancelled) {
        if (info) {
          setUpdate(info);
          setPhase("available");
        } else {
          // Sem atualização — não mostra nada
          setPhase("checking");
        }
      }
    }, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [betaUpdates]);

  const handleInstall = async () => {
    if (!update) return;
    setPhase("downloading");
    setStats({ loaded: 0, total: 0, speed: 0, percent: 0 });
    setErrorMsg("");

    try {
      if (isTauri()) {
        const { check } = await import("@tauri-apps/plugin-updater");
        const available = await check();
        if (!available) {
          throw new Error("Atualização não encontrada no endpoint.");
        }

        // Track velocidade via sampling de bytes baixados
        let lastTime = Date.now();
        let lastLoaded = 0;

        await available.downloadAndInstall((event) => {
          if (event.event === "Started" && event.data.contentLength) {
            setStats({
              loaded: 0,
              total: event.data.contentLength,
              speed: 0,
              percent: 0,
            });
          } else if (event.event === "Progress") {
            const now = Date.now();
            const dt = (now - lastTime) / 1000; // segundos
            const loaded = stats?.loaded ?? 0;
            const newLoaded = loaded + event.data.chunkLength;
            const speed = dt > 0 ? (newLoaded - lastLoaded) / dt : 0;
            const total = stats?.total ?? 0;
            const percent = total > 0 ? Math.min(100, (newLoaded / total) * 100) : 0;
            setStats({
              loaded: newLoaded,
              total,
              speed,
              percent,
            });
            lastTime = now;
            lastLoaded = newLoaded;
          } else if (event.event === "Finished") {
            setStats((s) => ({ ...s, percent: 100, loaded: s?.total ?? 0, speed: 0 }));
            setPhase("installing");
          }
        });

        setPhase("done");
        toast.success("Atualização instalada! Reiniciando o app…");
        // Relaunch
        try {
          const { relaunch } = await import("@tauri-apps/plugin-process");
          await relaunch();
        } catch {
          // plugin-process pode não estar disponível; usuário reinicia manualmente
        }
      } else {
        // Browser fallback: abre a release no GitHub
        if (update.downloadUrl) {
          window.open(update.downloadUrl, "_blank");
        }
        setPhase("done");
        toast.info("Abrindo a página de download no navegador…");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  };

  const close = () => {
    setDismissed(true);
    setUpdate(null);
    setPhase("checking");
    setStats(null);
    setErrorMsg("");
  };

  return (
    <Dialog
      open={Boolean(update) && !dismissed}
      onOpenChange={(v) => !v && close()}
    >
      <DialogContent className="glass-strong max-w-lg overflow-hidden p-0">
        {/* Faixa superior com gradiente */}
        <div className="relative bg-gradient-to-r from-primary/90 via-accent/80 to-primary/70 px-6 py-5 text-primary-foreground">
          <button
            onClick={close}
            className="no-drag absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/25 backdrop-blur">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {phase === "done" ? "Atualização concluída!" : "Nova versão disponível"}
              </DialogTitle>
              <DialogDescription className="text-primary-foreground/90">
                {update?.version && (
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <span className="font-mono opacity-80">{APP_VERSION}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="font-mono font-semibold">{update.version}</span>
                    {update.isPrerelease && (
                      <span className="rounded bg-white/25 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                        beta
                      </span>
                    )}
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Changelog */}
          {phase === "available" && (
            <>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  O que há de novo
                </p>
                <div className="max-h-48 overflow-y-auto scroll-mac rounded-lg bg-muted/40 p-3 text-sm">
                  <pre className="whitespace-pre-wrap font-sans text-foreground/80">
                    {update?.changelog || "Sem notas de lançamento."}
                  </pre>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={close}>
                  Depois
                </Button>
                <Button
                  onClick={handleInstall}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Download className="mr-1.5 h-4 w-4" /> Baixar e instalar
                </Button>
              </div>
            </>
          )}

          {/* Download com progresso + velocidade */}
          {(phase === "downloading" || phase === "installing") && stats && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    {phase === "downloading" ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Baixando atualização…
                      </>
                    ) : (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Instalando…
                      </>
                    )}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {stats.percent.toFixed(1)}%
                  </span>
                </div>
                {/* Barra de progresso customizada */}
                <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                    style={{ width: `${stats.percent}%` }}
                  />
                </div>
              </div>

              {/* Stats: velocidade + bytes */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <StatCard
                  icon={<Zap className="h-3 w-3" />}
                  label="Velocidade"
                  value={formatSpeed(stats.speed)}
                />
                <StatCard
                  icon={<Download className="h-3 w-3" />}
                  label="Baixado"
                  value={formatBytes(stats.loaded)}
                />
                <StatCard
                  icon={<Check className="h-3 w-3" />}
                  label="Total"
                  value={stats.total > 0 ? formatBytes(stats.total) : "—"}
                />
              </div>

              <p className="text-center text-xs text-muted-foreground">
                {phase === "downloading"
                  ? "O app será reiniciado automaticamente ao concluir."
                  : "Preparando os arquivos finais…"}
              </p>
            </div>
          )}

          {/* Sucesso */}
          {phase === "done" && (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
                <Check className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {isTauri() ? "Atualização instalada com sucesso!" : "Download iniciado no navegador"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isTauri()
                  ? "O app está reiniciando…"
                  : "Abra o instalador baixado para instalar a nova versão."}
              </p>
              <Button onClick={close} className="mt-4" variant="outline" size="sm">
                Fechar
              </Button>
            </div>
          )}

          {/* Erro */}
          {phase === "error" && (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15">
                <X className="h-7 w-7 text-destructive" />
              </div>
              <p className="text-sm font-medium text-foreground">Erro ao atualizar</p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">{errorMsg}</p>
              <div className="mt-4 flex gap-2">
                <Button onClick={close} variant="outline" size="sm">
                  Fechar
                </Button>
                <Button onClick={handleInstall} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Tentar novamente
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-2">
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-0.5 font-mono text-xs font-semibold text-foreground">{value}</p>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec === 0) return "—";
  return `${formatBytes(bytesPerSec)}/s`;
}
