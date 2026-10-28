"use client";
import { useState } from "react";
import { useEventStore } from "@/store/event-store";
import { GlassPanel } from "@/components/macos/GlassPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FontManager } from "@/lib/cert/FontManager";
import { ExcelBatchProcessor } from "@/lib/cert/ExcelBatchProcessor";
import { saveBlob } from "@/lib/tauri/TauriBridge";
import { UpdateChecker } from "@/lib/updater/UpdateChecker";
import { UpdateInstaller } from "@/lib/updater/UpdateInstaller";
import { APP_VERSION } from "@/lib/cert/Catalogs";
import { API_URL, isValidAccessKey } from "@/lib/events/apiConfig";
import { UpdateCheckerDialog } from "@/components/cert/UpdateDialog";
import {
  ArrowLeft,
  Type,
  Trash2,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Loader2,
  Sparkles,
  Check,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import type { UpdateInfo } from "@/lib/cert/types";
import { useUserAuth } from "@/store/user-auth";

/** Tela de Configurações Gerais. */
export function SettingsScreen() {
  const goHome = useEventStore((s) => s.goHome);
  const betaUpdates = useEventStore((s) => s.betaUpdates);
  const setBetaUpdates = useEventStore((s) => s.setBetaUpdates);
  const apiConfig = useEventStore((s) => s.apiConfig);
  const [customFonts, setCustomFonts] = useState(FontManager.instance.listAll().filter((f) => f.isCustom));
  const [checking, setChecking] = useState(false);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [installing, setInstalling] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const refreshFonts = () => setCustomFonts(FontManager.instance.listAll().filter((f) => f.isCustom));

  const removeFont = (id: string) => {
    FontManager.instance.removeCustom(id);
    refreshFonts();
    toast.success("Fonte removida.");
  };

  const handleDownloadExcelTemplate = async () => {
    try {
      const processor = new ExcelBatchProcessor();
      const blob = processor.createTemplateBlob();
      await saveBlob(blob, "modelo_participantes.xlsx", [
        { name: "Excel", extensions: ["xlsx"] },
      ]);
      toast.success("Modelo Excel salvo.");
    } catch (err) {
      toast.error("Erro ao gerar modelo", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleCheckUpdate = async () => {
    setChecking(true);
    try {
      const checker = new UpdateChecker(undefined, APP_VERSION);
      const info = await checker.check(betaUpdates);
      setUpdate(info);
      if (info) setDialogOpen(true);
      else toast.info("Você já está na versão mais recente.");
    } catch {
      toast.error("Não foi possível verificar atualização.");
    } finally {
      setChecking(false);
    }
  };

  const handleInstall = async () => {
    if (!update) return;
    setInstalling(true);
    try {
      const installer = new UpdateInstaller();
      const installed = await installer.install(update);
      if (!installed) toast.info("Abrindo a página de download no navegador…");
      else toast.success("Atualização instalada. O app será reiniciado.");
    } catch (err) {
      toast.error("Erro ao instalar", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setInstalling(false);
      setDialogOpen(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-6">
      <div className="mb-5 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={goHome}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Configurações</h2>
      </div>

      <div className="space-y-5">
        {/* Arquivos: fontes importadas */}
        <GlassPanel className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Type className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Fontes importadas</h3>
          </div>
          {customFonts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma fonte importada. Você pode importar fontes ao criar/editar um evento
              (no seletor de fonte, opção "Carregar nova fonte…").
            </p>
          ) : (
            <ul className="space-y-2">
              {customFonts.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between rounded-md border border-border/60 bg-muted/30 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{f.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.isCustom ? "Importada" : "Do app"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeFont(f.id)}
                    aria-label="Remover fonte"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>

        {/* Ferramentas: modelo Excel */}
        <GlassPanel className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Modelo de planilha</h3>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            Baixe um modelo Excel (.xlsx) com as colunas esperadas para importar participantes
            em eventos. Útil para preencher offline e importar depois.
          </p>
          <Button onClick={handleDownloadExcelTemplate} variant="outline" size="sm">
            <Download className="mr-1.5 h-4 w-4" /> Baixar modelo Excel
          </Button>
        </GlassPanel>

        {/* Validação Online (API) */}
        <GlassPanel className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Validação Online</h3>
            {isValidAccessKey(apiConfig.accessKey) && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="h-3 w-3" /> Ativo
              </span>
            )}
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            Insira sua chave de acesso para registrar certificados online e gerar QR codes
            de validação pública. A chave é fornecida pelo administrador do sistema.
          </p>
          <ApiConfigSection />
        </GlassPanel>

        {/* Atualizações */}
        <GlassPanel className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Atualizações</h3>
          </div>
          <div className="mb-3 flex items-center justify-between rounded-md border border-border/60 bg-muted/30 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-foreground">Versão atual</p>
              <p className="text-xs text-muted-foreground">{APP_VERSION}</p>
            </div>
            <Button
              onClick={handleCheckUpdate}
              disabled={checking}
              variant="outline"
              size="sm"
            >
              {checking ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-4 w-4" />
              )}
              Verificar agora
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="set-beta"
              checked={betaUpdates}
              onCheckedChange={(v) => setBetaUpdates(Boolean(v))}
            />
            <Label htmlFor="set-beta" className="cursor-pointer">
              Receber atualizações de teste (pre-release)
            </Label>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Por padrão, o app verifica automaticamente se há novidades ao abrir.
          </p>
        </GlassPanel>

        {/* Diálogo de atualização disponível */}
        <UpdateCheckerDialog />
      </div>

      {/* Renderização explícita do update encontrado pelo botão "Verificar agora" */}
      {update && !dialogOpen && (
        <GlassPanel className="mt-4 border-primary/40 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                Atualização disponível — {update.version}
              </p>
              <pre className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap font-sans text-xs text-muted-foreground">
                {update.changelog.slice(0, 400)}
              </pre>
              <div className="mt-3 flex gap-2">
                <Button onClick={handleInstall} disabled={installing} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {installing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
                  {installing ? "Instalando…" : "Atualizar agora"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setUpdate(null)}>
                  Depois
                </Button>
              </div>
            </div>
          </div>
        </GlassPanel>
      )}
    </div>
  );
}

/** Seção de configuração da API de validação. */
function ApiConfigSection() {
  const apiConfig = useEventStore((s) => s.apiConfig);
  const setApiConfig = useEventStore((s) => s.setApiConfig);
  const { user, accessKey: emailAccessKey, accessKeyIssuer } = useUserAuth();
  const [accessKey, setAccessKey] = useState(apiConfig.accessKey);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [issuer, setIssuer] = useState<string | null>(null);

  // Se o user tem chave via email, ela SEMPRE sobrescreve o campo manual
  const hasEmailKey = Boolean(user && emailAccessKey);
  const effectiveKey = hasEmailKey ? emailAccessKey : accessKey;

  const handleSave = () => {
    if (hasEmailKey) {
      toast.info("Sua chave é gerenciada pela sua conta. Faça login para usar.");
      return;
    }
    setApiConfig({ accessKey: accessKey.trim() });
    setSaved(true);
    toast.success("Chave de acesso salva.");
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    if (!isValidAccessKey(effectiveKey.trim())) {
      toast.warning("Insira uma chave de acesso válida (começa com gdc_).");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch(`${API_URL}/api/certificates/key-info`, {
        headers: { "Authorization": `Bearer ${effectiveKey.trim()}` },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        setIssuer(data.issuer || "Desconhecido");
        toast.success(`Chave válida! Emissor: ${data.issuer}`);
      } else if (res.status === 401) {
        toast.error("Chave inválida ou não encontrada");
        setIssuer(null);
      } else if (res.status === 403) {
        toast.error("Chave revogada pelo administrador");
        setIssuer(null);
      } else {
        toast.error(`Erro: HTTP ${res.status}`);
      }
    } catch (err) {
      toast.error("Não foi possível conectar à API", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-3">
      {hasEmailKey && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Chave gerenciada pela conta
          </div>
          <p className="mt-1 text-emerald-600/80 dark:text-emerald-400/80">
            Emissor: <strong>{accessKeyIssuer || "—"}</strong> — a chave é associada ao seu email e não pode ser editada manualmente. Peça ao admin para substituir se precisar.
          </p>
        </div>
      )}
      <div className="space-y-1.5">
        <Label>Chave de acesso</Label>
        <Input
          type="password"
          value={effectiveKey}
          onChange={(e) => !hasEmailKey && setAccessKey(e.target.value)}
          placeholder="gdc_xxxxxxxxxxxxxxxxxxxxxxxx"
          className="font-mono"
          disabled={hasEmailKey}
          readOnly={hasEmailKey}
        />
        {effectiveKey && (
          <p className="text-xs text-muted-foreground">
            {effectiveKey.slice(0, 8)}••••••••••••••••••{effectiveKey.slice(-4)}
          </p>
        )}
      </div>
      {issuer && !hasEmailKey && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Emissor: </span>
          <strong className="text-foreground">{issuer}</strong>
        </div>
      )}
      {!hasEmailKey && (
        <div className="flex items-center gap-2 pt-1">
          <Button onClick={handleSave} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
            {saved ? <Check className="mr-1.5 h-4 w-4" /> : null}
            {saved ? "Salvo!" : "Salvar"}
          </Button>
          <Button onClick={handleTest} disabled={testing} variant="outline" size="sm">
            {testing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-1.5 h-4 w-4" />}
            Validar chave
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        A chave de acesso é fornecida pelo administrador do sistema. Cada chave está
        associada a um emissor (que aparece na validação pública) e pode ser revogada a
        qualquer momento. {hasEmailKey ? "Como você está logado, sua chave é gerenciada pela sua conta." : "Todo certificado gerado receberá um QR code de validação."}
      </p>
    </div>
  );
}

