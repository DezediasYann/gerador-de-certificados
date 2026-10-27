"use client";
import { useEffect } from "react";
import { WindowControls } from "@/components/macos/WindowControls";
import { ThemeToggle } from "@/components/macos/theme-toggle";
import { HomeScreen } from "@/components/events/HomeScreen";
import { EventWizard } from "@/components/events/EventWizard";
import { EventScreen } from "@/components/events/EventScreen";
import { SettingsScreen } from "@/components/events/SettingsScreen";
import { UpdateCheckerDialog } from "@/components/cert/UpdateDialog";
import { useEventStore } from "@/store/event-store";
import { APP_VERSION } from "@/lib/cert/Catalogs";
import { Button } from "@/components/ui/button";
import { Twitter, Instagram, Bug, Settings } from "lucide-react";

export default function Home() {
  const view = useEventStore((s) => s.view);
  const init = useEventStore((s) => s.init);
  const goSettings = useEventStore((s) => s.goSettings);

  useEffect(() => {
    init();
  }, [init]);

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
          <ThemeToggle />
        </div>
        <WindowControls side="right" />
      </header>

      {/* ━━ Conteúdo principal: views ━━ */}
      <main className="flex flex-1 flex-col">
        {view === "home" && <HomeScreen />}
        {view === "wizard" && <EventWizard />}
        {view === "event" && <EventScreen />}
        {view === "settings" && <SettingsScreen />}
      </main>

      <UpdateCheckerDialog />
    </div>
  );
}
