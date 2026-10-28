"use client";
import { useEffect, useState } from "react";
import { useUserAuth } from "@/store/user-auth";
import { useEventStore } from "@/store/event-store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  uploadBackup,
  downloadAndDecryptBackup,
  listBackups,
  type BackupMetadata,
} from "@/lib/auth/backup-service";
import { PreferencesStore } from "@/lib/storage/PreferencesStore";
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  Loader2,
  Check,
  History,
  Trash2,
  LogOut,
  AlertTriangle,
  Key,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

/** Painel de backup E2E — aparece nas Configurações quando o usuário está logado. */
export function BackupPanel() {
  const { user, token, password, logout, accessKey, accessKeyIssuer, fetchAccessKey } = useUserAuth();
  const events = useEventStore((s) => s.events);
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [autoBackup, setAutoBackup] = useState(false);
  const [restorePassword, setRestorePassword] = useState("");
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  // Carrega preferência de auto-backup
  useEffect(() => {
    const prefs = new PreferencesStore();
    void prefs.get<boolean>("auto_backup", false).then(setAutoBackup);
  }, []);

  // Carrega lista de backups ao montar
  useEffect(() => {
    if (!token) return;
    void loadBackups();
  }, [token]);

  const loadBackups = async () => {
    if (!token) return;
    setLoadingBackups(true);
    try {
      const list = await listBackups(token);
      setBackups(list);
    } catch (err) {
      // silencioso — pode estar offline
      console.warn("Erro ao listar backups:", err);
    } finally {
      setLoadingBackups(false);
    }
  };

  const toggleAutoBackup = async (v: boolean) => {
    setAutoBackup(v);
    const prefs = new PreferencesStore();
    await prefs.set("auto_backup", v);
    if (v) toast.success("Backup automático ativado. Será enviado a cada mudança.");
    else toast.info("Backup automático desativado.");
  };

  const handleBackupNow = async () => {
    if (!token || !password || !user) {
      toast.error("Sessão inválida. Faça login novamente.");
      return;
    }
    setUploading(true);
    try {
      const meta = await uploadBackup(token, password, user.kdfSalt, events);
      toast.success(`Backup enviado! ${events.length} evento(s), ${formatBytes(meta.sizeBytes)}.`);
      await loadBackups();
    } catch (err) {
      toast.error("Erro ao enviar backup", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRestore = async () => {
    if (!token || !password || !user) {
      toast.error("Sessão inválida. Faça login novamente.");
      return;
    }
    if (!restorePassword) {
      toast.warning("Digite sua senha para descriptografar o backup.");
      return;
    }
    setDownloading(true);
    try {
      // Usa a senha digitada (pode ser diferente da sessão atual se o usuário trocou)
      const { events: restoredEvents, metadata } = await downloadAndDecryptBackup(
        token,
        restorePassword,
        user.kdfSalt,
      );
      // Mescla eventos restaurados com os atuais (não sobrescreve — adiciona)
      const existingIds = new Set(events.map((e) => e.id));
      const newEvents = restoredEvents.filter((e) => !existingIds.has(e.id));
      if (newEvents.length === 0) {
        toast.info("Todos os eventos do backup já existem localmente.");
      } else {
        // Salva cada evento restaurado via repo
        const { EventRepository } = await import("@/lib/events/EventRepository");
        const repo = new EventRepository();
        for (const ev of newEvents) {
          await repo.save(ev);
        }
        // Recarrega a lista de eventos no store
        const all = await repo.list();
        useEventStore.setState({ events: all });
        toast.success(`${newEvents.length} evento(s) restaurado(s) do backup de ${new Date(metadata.createdAt).toLocaleDateString("pt-BR")}.`);
      }
      setShowRestoreConfirm(false);
      setRestorePassword("");
    } catch (err) {
      toast.error("Erro ao restaurar backup", {
        description: err instanceof Error ? err.message : "Verifique se a senha está correta.",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteBackup = async (id: string) => {
    if (!token) return;
    try {
      const { deleteBackup } = await import("@/lib/auth/backup-service");
      await deleteBackup(token, id);
      setBackups((prev) => prev.filter((b) => b.id !== id));
      toast.success("Backup deletado.");
    } catch (err) {
      toast.error("Erro ao deletar backup", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-4">
      {/* Info da conta */}
      <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/30 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void logout()} className="text-muted-foreground hover:text-destructive">
          <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sair
        </Button>
      </div>

      {/* Access key associada */}
      <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Key className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chave de acesso</span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-6 w-6"
            onClick={() => void fetchAccessKey()}
            aria-label="Atualizar chave"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        {accessKey ? (
          <div className="mt-1.5">
            <p className="font-mono text-xs text-foreground break-all">{accessKey.slice(0, 12)}••••••••{accessKey.slice(-4)}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Emissor: {accessKeyIssuer || "—"}</p>
            <p className="mt-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">✓ Validação online ativa (auto-preenchida)</p>
          </div>
        ) : (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Nenhuma chave associada. Peça ao administrador para criar uma access key para sua conta —
            ela aparecerá aqui automaticamente.
          </p>
        )}
      </div>

      {/* Backup automático */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="auto-backup"
          checked={autoBackup}
          onCheckedChange={(v) => void toggleAutoBackup(Boolean(v))}
        />
        <Label htmlFor="auto-backup" className="cursor-pointer">
          Backup automático a cada mudança (recomendado)
        </Label>
      </div>

      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleBackupNow} disabled={uploading} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
          {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CloudUpload className="mr-1.5 h-4 w-4" />}
          {uploading ? "Enviando…" : "Backup agora"}
        </Button>
        <Button
          onClick={() => setShowRestoreConfirm(true)}
          disabled={downloading}
          variant="outline"
          size="sm"
        >
          <CloudDownload className="mr-1.5 h-4 w-4" /> Restaurar
        </Button>
      </div>

      {/* Confirmar restore com senha */}
      {showRestoreConfirm && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-3">
          <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              A restauração mescla os eventos do backup com os locais (não sobrescreve).
              Digite sua senha para descriptografar o backup.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="restore-pw">Senha</Label>
            <Input
              id="restore-pw"
              type="password"
              value={restorePassword}
              onChange={(e) => setRestorePassword(e.target.value)}
              placeholder="Sua senha"
              autoComplete="current-password"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRestore} disabled={downloading} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              {downloading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
              {downloading ? "Restaurando…" : "Confirmar restore"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setShowRestoreConfirm(false); setRestorePassword(""); }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Histórico */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <History className="h-3.5 w-3.5" /> Histórico ({backups.length})
        </div>
        {loadingBackups ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando…
          </div>
        ) : backups.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum backup enviado ainda.</p>
        ) : (
          <ul className="max-h-48 space-y-1.5 overflow-y-auto scroll-mac pr-1">
            {backups.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between rounded-md border border-border/40 bg-muted/20 px-2.5 py-1.5"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">
                    {new Date(b.createdAt).toLocaleString("pt-BR")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {b.eventCount} evento(s) • {formatBytes(b.sizeBytes)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => void handleDeleteBackup(b.id)}
                  aria-label="Deletar backup"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
        <Cloud className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <p>
          Seus eventos são <strong>criptografados ponta-a-ponta</strong> (AES-256-GCM com chave
          derivada da sua senha via PBKDF2). O servidor armazena apenas o blob cifrado —
          nem o administrador consegue lê-lo sem sua senha.
        </p>
      </div>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
