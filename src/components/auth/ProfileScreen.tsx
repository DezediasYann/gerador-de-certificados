"use client";
import { useState } from "react";
import { useEventStore } from "@/store/event-store";
import { useUserAuth } from "@/store/user-auth";
import { GlassPanel } from "@/components/macos/GlassPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, User as UserIcon, Lock, Key, Cloud, LogOut, Mail } from "lucide-react";
import { BackupPanel } from "@/components/auth/BackupPanel";
import { toast } from "sonner";

/**
 * Tela de Perfil do usuário.
 * Centraliza: info da conta, troca de senha, backup E2E, chave de acesso associada.
 * Separada das Configurações Gerais (que tratam de fontes, modelo Excel, atualizações).
 */
export function ProfileScreen() {
  const goHome = useEventStore((s) => s.goHome);
  const { user, accessKey, accessKeyIssuer, logout } = useUserAuth();

  if (!user) {
    // Defensive — não deveria chegar aqui sem login
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={goHome}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">Faça login para ver seu perfil.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-6">
      <div className="mb-5 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={goHome}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Perfil</h2>
      </div>

      <div className="space-y-5">
        {/* Info da conta */}
        <GlassPanel className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Conta</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-medium text-foreground">{user.name}</p>
              <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
                <Mail className="h-3 w-3" /> {user.email}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Membro desde {new Date(user.createdAt).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void logout()} className="text-muted-foreground hover:text-destructive">
              <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sair
            </Button>
          </div>
        </GlassPanel>

        {/* Trocar senha */}
        <ChangePasswordCard />

        {/* Chave de acesso */}
        <GlassPanel className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Chave de acesso</h3>
          </div>
          {accessKey ? (
            <div>
              <p className="font-mono text-xs text-foreground break-all">{accessKey.slice(0, 12)}••••••••{accessKey.slice(-4)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Emissor: {accessKeyIssuer || "—"}</p>
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">✓ Validação online ativa</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nenhuma chave associada. Peça ao administrador para criar uma access key para sua conta.
            </p>
          )}
        </GlassPanel>

        {/* Backup E2E */}
        <GlassPanel className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Cloud className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Backup criptografado</h3>
          </div>
          <BackupPanel />
        </GlassPanel>
      </div>
    </div>
  );
}

/** Card de troca de senha. */
function ChangePasswordCard() {
  const { changePassword, loading } = useUserAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) {
      toast.error("Nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (next !== confirm) {
      toast.error("As senhas não conferem.");
      return;
    }
    const ok = await changePassword(current, next);
    if (ok) {
      toast.success("Senha alterada com sucesso. Use a nova senha no próximo login.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } else {
      toast.error("Erro ao trocar senha. Verifique a senha atual.");
    }
  };

  return (
    <GlassPanel className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <Lock className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Trocar senha</h3>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="cur-pw" className="text-xs">Senha atual</Label>
          <Input
            id="cur-pw"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            autoComplete="current-password"
            className="h-9 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-pw" className="text-xs">Nova senha (mín. 8)</Label>
            <Input
              id="new-pw"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-pw" className="text-xs">Confirmar</Label>
            <Input
              id="confirm-pw"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="h-9 text-sm"
            />
          </div>
        </div>
        <Button type="submit" disabled={loading} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
          {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Lock className="mr-1.5 h-3.5 w-3.5" />}
          Trocar senha
        </Button>
      </form>
    </GlassPanel>
  );
}
