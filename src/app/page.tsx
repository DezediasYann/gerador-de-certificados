"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WindowControls } from "@/components/macos/WindowControls";
import { ThemeToggle } from "@/components/macos/theme-toggle";
import { HomeScreen } from "@/components/events/HomeScreen";
import { EventWizard } from "@/components/events/EventWizard";
import { EventScreen } from "@/components/events/EventScreen";
import { SettingsScreen } from "@/components/events/SettingsScreen";
import { ProfileScreen } from "@/components/auth/ProfileScreen";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { UpdateCheckerDialog } from "@/components/cert/UpdateDialog";
import { useEventStore } from "@/store/event-store";
import { useUserAuth } from "@/store/user-auth";
import { APP_VERSION } from "@/lib/cert/Catalogs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Twitter, Instagram, Bug, Settings, User as UserIcon, LogOut, UserCircle, KeyRound } from "lucide-react";
import { pageTransitionProps } from "@/lib/animations";

export default function Home() {
  const view = useEventStore((s) => s.view);
  const init = useEventStore((s) => s.init);
  const goSettings = useEventStore((s) => s.goSettings);
  const goPerfil = useEventStore((s) => s.goPerfil);
  const goHome = useEventStore((s) => s.goHome);
  const { user, restoreSession, token, password, logout } = useUserAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    init();
    restoreSession();
  }, [init, restoreSession]);

  // Auto-backup (debounced) quando eventos mudam e o usuário está logado com auto-backup on
  const events = useEventStore((s) => s.events);
  useEffect(() => {
    if (!user || !token || !password) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      // Verifica se auto-backup está ligado
      const { PreferencesStore } = await import("@/lib/storage/PreferencesStore");
      const prefs = new PreferencesStore();
      const auto = await prefs.get<boolean>("auto_backup", false);
      if (!auto || cancelled) return;
      try {
        const { uploadBackup } = await import("@/lib/auth/backup-service");
        await uploadBackup(token, password, user.kdfSalt, events);
      } catch (err) {
        console.warn("Auto-backup falhou:", err);
      }
    }, 5000); // debounce 5s
    return () => { cancelled = true; clearTimeout(timer); };
  }, [events, user, token, password]);

  const openSocial = (url: string) => window.open(url, "_blank", "noopener");

  return (
    <div className="flex min-h-screen flex-col">
      {/* ━━ Window chrome ━━ */}
      <header className="drag-region sticky top-0 z-30 flex h-12 items-center gap-3 px-4 glass-strong border-b border-border/40">
        <WindowControls side="left" />
        <div className="no-drag flex items-baseline gap-2">
          <h1 className="text-sm font-semibold tracking-tight">Gerador de Certificados</h1>
          <span className="text-xs text-muted-foreground">{APP_VERSION}</span>
        </div>

        <div className="no-drag ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            aria-label="Twitter"
            onClick={() => openSocial("https://x.com/yanndezedias/")}
          >
            <Twitter className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            aria-label="Instagram"
            onClick={() => openSocial("https://instagram.com/yanndezedias/")}
          >
            <Instagram className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            aria-label="Reportar bug"
            onClick={() =>
              openSocial("mailto:yanndezedias16@gmail.com?subject=Bug Report - Gerador de Certificados")
            }
          >
            <Bug className="h-4 w-4" />
          </Button>
          <div className="mx-1 h-5 w-px bg-border/60" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            aria-label="Configurações"
            onClick={() => goSettings()}
          >
            <Settings className="h-4 w-4" />
          </Button>

          {/* Perfil / Login */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="no-drag ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors"
                  aria-label="Perfil"
                >
                  {user.name.charAt(0).toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user.name}</span>
                    <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => goPerfil()} className="cursor-pointer">
                  <UserCircle className="mr-2 h-4 w-4" /> Meu perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => goHome()} className="cursor-pointer">
                  <UserIcon className="mr-2 h-4 w-4" /> Meus eventos
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void logout()} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-full"
              onClick={() => setLoginOpen(true)}
            >
              <UserIcon className="h-4 w-4" /> Entrar
            </Button>
          )}

          <ThemeToggle />
        </div>
        <WindowControls side="right" />
      </header>

      {/* ━━ Conteúdo principal: views com transição ━━ */}
      <main className="flex flex-1 flex-col">
        <AnimatePresence mode="wait">
          <motion.div key={view} {...pageTransitionProps} className="contents">
            {view === "home" && <HomeScreen />}
            {view === "wizard" && <EventWizard />}
            {view === "event" && <EventScreen />}
            {view === "settings" && <SettingsScreen />}
            {view === "perfil" && <ProfileScreen />}
          </motion.div>
        </AnimatePresence>
      </main>

      <UpdateCheckerDialog />

      {/* Dialog de login (abre quando user não autenticado clica em "Entrar") */}
      <LoginScreen open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
}
