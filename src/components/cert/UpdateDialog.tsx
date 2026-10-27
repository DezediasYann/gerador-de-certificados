"use client";
import { useEffect, useState } from "react";
import { UpdateChecker } from "@/lib/updater/UpdateChecker";
import { UpdateInstaller } from "@/lib/updater/UpdateInstaller";
import { useCertStore } from "@/store/cert-store";
import { APP_VERSION } from "@/lib/cert/Catalogs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { UpdateInfo } from "@/lib/cert/types";

/** Verifica atualização ao montar e exibe diálogo se houver. */
export function UpdateCheckerDialog() {
  const betaUpdates = useCertStore((s) => s.betaUpdates);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const checker = new UpdateChecker(undefined, APP_VERSION);
      const info = await checker.check(betaUpdates);
      if (!cancelled && info) setUpdate(info);
    }, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [betaUpdates]);

  const handleInstall = async () => {
    if (!update) return;
    setInstalling(true);
    try {
      const installer = new UpdateInstaller();
      const installed = await installer.install(update);
      if (!installed) {
        toast.info("Abrindo a página de download no navegador…");
      } else {
        toast.success("Atualização instalada. O app será reiniciado.");
      }
    } catch (err) {
      toast.error("Erro ao instalar atualização", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setInstalling(false);
      setDismissed(true);
    }
  };

  return (
    <Dialog
      open={Boolean(update) && !dismissed}
      onOpenChange={(v) => !v && setDismissed(true)}
    >
      <DialogContent className="glass-strong max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Atualização disponível — {update?.version}
          </DialogTitle>
          <DialogDescription>
            Uma nova versão do Gerador de Certificados está disponível.
            {update?.isPrerelease && (
              <span className="ml-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-600 dark:text-amber-400">
                pré-release
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-64 overflow-y-auto scroll-mac rounded-lg bg-muted/40 p-3 text-sm">
          <p className="mb-1 font-medium">O que há de novo:</p>
          <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted-foreground">
            {update?.changelog}
          </pre>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDismissed(true)} disabled={installing}>
            Depois
          </Button>
          <Button onClick={handleInstall} disabled={installing} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {installing ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-4 w-4" />
            )}
            {installing ? "Instalando…" : "Atualizar agora"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
