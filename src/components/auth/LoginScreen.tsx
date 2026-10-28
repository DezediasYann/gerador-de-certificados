"use client";
import { useState } from "react";
import { useUserAuth } from "@/store/user-auth";
import { GlassPanel } from "@/components/macos/GlassPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Lock, Mail, User, Shield, Cloud, KeyRound } from "lucide-react";

/**
 * Dialog de login/registro do app desktop.
 * Aberto pelo botão de perfil no header quando o user não está autenticado.
 * Inclui "Esqueci minha senha" que dispara reset por email.
 */
export function LoginScreen({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { login, register, loading, error, clearError } = useUserAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let ok = false;
    if (mode === "login") {
      ok = await login(email, password);
    } else {
      ok = await register(email, password, name);
    }
    if (ok) {
      // Fecha o dialog e limpa
      onOpenChange(false);
      setEmail("");
      setPassword("");
      setName("");
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await useUserAuth.getState().forgotPassword(forgotEmail);
    if (ok) {
      setForgotOpen(false);
      setForgotEmail("");
      // Mensagem via state de error do store é mostrada no dialog principal
    }
  };

  const switchMode = (m: "login" | "register") => {
    setMode(m);
    clearError();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader>
            <div className="mb-2 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-center">
              {mode === "login" ? "Entrar" : "Criar conta"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {mode === "login"
                ? "Acesse para sincronizar seus eventos com backup criptografado"
                : "Crie uma conta para backup E2E dos seus eventos"}
            </DialogDescription>
          </DialogHeader>

          {/* Tabs login/register */}
          <div className="mb-4 flex rounded-lg bg-muted/50 p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === "login" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === "register" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "register" && (
              <div className="space-y-1.5">
                <Label htmlFor="ls-name">Nome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="ls-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="pl-9"
                    required
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="ls-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="ls-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="pl-9"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ls-password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="ls-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "Mínimo 8 caracteres" : "••••••••"}
                  className="pl-9"
                  required
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  minLength={mode === "register" ? 8 : undefined}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          {/* Esqueci minha senha */}
          {mode === "login" && (
            <button
              type="button"
              onClick={() => { setForgotOpen(true); clearError(); }}
              className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Esqueci minha senha
            </button>
          )}

          {/* Info sobre E2E */}
          <div className="flex items-start gap-2 rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
            <Cloud className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              Seus eventos são <strong>criptografados ponta-a-ponta</strong> antes de enviar ao servidor.
              Nem mesmo o administrador da VPS consegue lê-los — só você com sua senha.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog "Esqueci minha senha" */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="glass-strong max-w-sm">
          <DialogHeader>
            <div className="mb-2 flex items-center justify-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <KeyRound className="h-5 w-5 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-center">Redefinir senha</DialogTitle>
            <DialogDescription className="text-center">
              Digite seu email. Se a conta existir, você receberá um link de redefinição.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgot} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
              />
            </div>
            {error && (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
                {error || "Se o email existir, você receberá o link de reset."}
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Enviar link de reset
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
