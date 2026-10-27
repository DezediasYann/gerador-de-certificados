"use client";
import { useState } from "react";
import { GlassPanel } from "@/components/macos/GlassPanel";
import { TrafficLights } from "@/components/macos/TrafficLights";
import { ThemeToggle } from "@/components/macos/theme-toggle";
import { CertificatePreview } from "@/components/cert/CertificatePreview";
import { ParticipantForm, EventForm } from "@/components/cert/CertForms";
import { SettingsPanel } from "@/components/cert/SettingsPanel";
import { Toolbar } from "@/components/cert/Toolbar";
import { UpdateCheckerDialog } from "@/components/cert/UpdateDialog";
import { APP_VERSION } from "@/lib/cert/Catalogs";
import { cn } from "@/lib/utils";
import { User, Calendar, Settings, Twitter, Instagram, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";

type Tab = "participante" | "evento" | "ajustes";

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: "participante", label: "Participante", icon: User },
  { id: "evento", label: "Evento", icon: Calendar },
  { id: "ajustes", label: "Ajustes", icon: Settings },
];

export default function Home() {
  const [tab, setTab] = useState<Tab>("participante");

  const openSocial = (url: string) => window.open(url, "_blank", "noopener");

  return (
    <div className="flex min-h-screen flex-col">
      {/* ━━ Window chrome (header fixo no topo, drag region para Tauri) ━━ */}
      <header
        className="drag-region sticky top-0 z-30 flex h-12 items-center gap-3 px-4 glass-strong border-b border-border/40"
      >
        <TrafficLights />
        <div className="no-drag ml-2 flex items-baseline gap-2">
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
          <ThemeToggle />
        </div>
      </header>

      {/* ━━ Conteúdo principal: sidebar de abas + formulário + preview ━━ */}
      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 p-4 lg:flex-row lg:p-6">
        {/* Coluna esquerda: tabs + formulário */}
        <section className="flex w-full flex-col gap-3 lg:w-[380px] lg:flex-shrink-0">
          {/* Tabs (na sidebar em desktop, no topo em mobile) */}
          <GlassPanel className="p-1.5">
            <nav className="flex gap-1" role="tablist">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors",
                    tab === id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </nav>
          </GlassPanel>

          {/* Formulário da aba ativa */}
          <GlassPanel className="flex-1 overflow-y-auto scroll-mac p-5">
            {tab === "participante" && <ParticipantForm />}
            {tab === "evento" && <EventForm />}
            {tab === "ajustes" && <SettingsPanel />}
          </GlassPanel>
        </section>

        {/* Coluna direita: preview */}
        <section className="flex min-h-[400px] flex-1 flex-col">
          <GlassPanel className="flex flex-1 flex-col p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-foreground">
                Pré-visualização em tempo real
              </h2>
              <span className="text-xs text-muted-foreground">2000 × 1414</span>
            </div>
            <CertificatePreview />
          </GlassPanel>
        </section>
      </main>

      {/* ━━ Footer fixo com ações ━━ */}
      <footer
        className="sticky bottom-0 z-20 mt-auto border-t border-border/60 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        style={{ background: "var(--glass-strong)", backdropFilter: "blur(28px) saturate(1.5)", WebkitBackdropFilter: "blur(28px) saturate(1.5)", boxShadow: "0 -4px 20px -8px rgba(0,0,0,0.10)" }}
      >
        <div className="mx-auto w-full max-w-[1600px]">
          <Toolbar />
        </div>
      </footer>

      {/* Verificação de atualização ao iniciar */}
      <UpdateCheckerDialog />
    </div>
  );
}
