"use client";
import { useState } from "react";
import { useEventStore } from "@/store/event-store";
import { GlassPanel } from "@/components/macos/GlassPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ParticipantGrid } from "./ParticipantGrid";
import { CertificatePreviewMini } from "./CertificatePreviewMini";
import { ZipExporter } from "@/lib/events/ZipExporter";
import { saveBlob } from "@/lib/tauri/TauriBridge";
import { TIPOS_DE_ATIVIDADE } from "@/lib/cert/Catalogs";
import { FontSelect } from "@/components/cert/FontSelect";
import { ArrowLeft, Download, Loader2, Settings, Calendar, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Evento } from "@/lib/events/types";

/** Tela de um evento individual. */
export function EventScreen() {
  const events = useEventStore((s) => s.events);
  const currentEventId = useEventStore((s) => s.currentEventId);
  const goHome = useEventStore((s) => s.goHome);
  const updateEvent = useEventStore((s) => s.updateEvent);

  const evento = events.find((e) => e.id === currentEventId);
  const [zipping, setZipping] = useState(false);

  if (!evento) {
    // Defensive: shouldn't happen
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Evento não encontrado.{" "}
        <Button variant="link" onClick={goHome}>
          Voltar à tela inicial
        </Button>
      </div>
    );
  }

  const handleDownloadAll = async () => {
    if (evento.participantes.length === 0) {
      toast.warning("Adicione participantes antes de gerar os certificados.");
      return;
    }
    const semNome = evento.participantes.filter((p) => !p.nome.trim());
    if (semNome.length > 0) {
      toast.warning(`${semNome.length} participante(s) sem nome serão ignorados.`);
    }
    setZipping(true);
    try {
      const exporter = new ZipExporter();
      const blob = await exporter.export(evento);
      const filename = `${evento.nome.toUpperCase().replace(/\s+/g, "_")}-certificados.zip`;
      await saveBlob(blob, filename, [{ name: "ZIP", extensions: ["zip"] }]);
      toast.success(`${evento.participantes.length} certificados gerados em ${filename}`);
    } catch (err) {
      toast.error("Erro ao gerar ZIP", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setZipping(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 px-4 py-4 lg:px-6">
      {/* Header do evento */}
      <GlassPanel className="flex flex-wrap items-center gap-3 p-4">
        <Button variant="ghost" size="sm" onClick={goHome} aria-label="Voltar">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">
            {evento.nome}
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {evento.tipoAtividade}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" /> {evento.participantes.length} participante{evento.participantes.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <EventSettingsDialog evento={evento} onUpdate={updateEvent} />
          <Button
            onClick={handleDownloadAll}
            disabled={zipping || evento.participantes.length === 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {zipping ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
            {zipping ? "Gerando…" : "Baixar todos (ZIP)"}
          </Button>
        </div>
      </GlassPanel>

      {/* Conteúdo: grid + preview */}
      <div className="flex flex-1 flex-col gap-4 lg:flex-row">
        {/* Coluna principal: participantes */}
        <section className="flex-1">
          <GlassPanel className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Participantes</h3>
            <ParticipantGrid evento={evento} />
          </GlassPanel>
        </section>

        {/* Coluna lateral: preview do certificado */}
        <aside className="lg:w-[480px] lg:flex-shrink-0">
          <GlassPanel className="flex flex-col p-3">
            <h3 className="mb-2 px-1 text-sm font-semibold text-foreground">Pré-visualização</h3>
            <div className="flex min-h-[400px] flex-1 flex-col">
              <CertificatePreviewMini evento={evento} />
            </div>
            <p className="mt-2 px-1 text-xs text-muted-foreground">
              O preview usa o primeiro participante (ou um placeholder) com as configurações do evento.
            </p>
          </GlassPanel>
        </aside>
      </div>
    </div>
  );
}

/** Diálogo de configurações do evento (editável após criação). */
function EventSettingsDialog({
  evento,
  onUpdate,
}: {
  evento: Evento;
  onUpdate: (id: string, patch: Partial<Evento>) => Promise<void>;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="mr-1.5 h-4 w-4" /> Ajustes
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-strong flex h-[88vh] w-[95vw] max-w-[1400px] flex-col overflow-hidden p-5 sm:max-w-[1400px]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Configurações do evento</DialogTitle>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto scroll-mac lg:grid-cols-[minmax(0,420px)_1fr]">
          {/* Coluna de configurações */}
          <div className="space-y-5 py-1">
            {/* Identificação */}
            <section className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identificação</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="s-nome">Nome</Label>
                  <Input
                    id="s-nome"
                    value={evento.nome}
                    onChange={(e) => onUpdate(evento.id, { nome: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-nomeEv">Nome no certificado</Label>
                <Input
                  id="s-nomeEv"
                  value={evento.nomeEvento}
                  onChange={(e) => onUpdate(evento.id, { nomeEvento: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de atividade</Label>
                <Select
                  value={evento.tipoAtividade}
                  onValueChange={(v) => onUpdate(evento.id, { tipoAtividade: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_DE_ATIVIDADE.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-ch">Carga horária padrão</Label>
                <Input
                  id="s-ch"
                  value={evento.cargaHorariaPadrao}
                  onChange={(e) => onUpdate(evento.id, { cargaHorariaPadrao: e.target.value })}
                  placeholder="Ex.: 5h"
                />
                <p className="text-xs text-muted-foreground">Aplicada quando o participante não tem carga própria.</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="s-date"
                checked={evento.useDate}
                onCheckedChange={(v) => onUpdate(evento.id, { useDate: Boolean(v) })}
              />
              <Label htmlFor="s-date" className="cursor-pointer">Incluir data/período</Label>
            </div>
            {evento.useDate && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="s-di">Data início</Label>
                  <Input
                    id="s-di"
                    value={evento.dataInicio}
                    onChange={(e) => onUpdate(evento.id, { dataInicio: e.target.value })}
                    placeholder="Ex.: 23/03/2026"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-df">Data fim</Label>
                  <Input
                    id="s-df"
                    value={evento.dataFim}
                    onChange={(e) => onUpdate(evento.id, { dataFim: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
              </div>
            )}
          </section>

          {/* Aparência */}
          <section className="space-y-3 border-t border-border/60 pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aparência do certificado</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fonte</Label>
                <FontSelect
                  value={evento.appearance.fontName}
                  onChange={(id) =>
                    onUpdate(evento.id, { appearance: { ...evento.appearance, fontName: id } })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Tamanho</Label>
                  <span className="text-xs text-muted-foreground">{evento.appearance.fontSize} pt</span>
                </div>
                <Slider
                  value={[evento.appearance.fontSize]}
                  min={20}
                  max={120}
                  step={1}
                  onValueChange={(v) =>
                    onUpdate(evento.id, { appearance: { ...evento.appearance, fontSize: v[0] } })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Posição X</Label>
                <Input
                  type="number"
                  value={evento.appearance.posX}
                  onChange={(e) =>
                    onUpdate(evento.id, { appearance: { ...evento.appearance, posX: Number(e.target.value) } })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Posição Y</Label>
                <Input
                  type="number"
                  value={evento.appearance.posY}
                  onChange={(e) =>
                    onUpdate(evento.id, { appearance: { ...evento.appearance, posY: Number(e.target.value) } })
                  }
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="s-italic"
                checked={evento.appearance.useItalic}
                onCheckedChange={(v) =>
                  onUpdate(evento.id, { appearance: { ...evento.appearance, useItalic: Boolean(v) } })
                }
              />
              <Label htmlFor="s-italic" className="cursor-pointer">Itálico no nome do evento/trabalho</Label>
            </div>
          </section>
          </div>

          {/* Coluna de preview ao vivo */}
          <div className="flex min-h-0 flex-col">
            <h4 className="mb-2 flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pré-visualização
            </h4>
            <div className="flex min-h-0 flex-1 flex-col">
              <CertificatePreviewMini evento={evento} />
            </div>
            <p className="mt-2 flex-shrink-0 text-xs text-muted-foreground">
              O preview reage às configurações em tempo real. Use o primeiro participante (ou placeholder) como referência.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
