"use client";
import { useState } from "react";
import { useEventStore } from "@/store/event-store";
import { GlassPanel } from "@/components/macos/GlassPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { LabeledSlider } from "@/components/ui/labeled-slider";
import { ParticipantGrid } from "./ParticipantGrid";
import { CertificatePreviewMini } from "./CertificatePreviewMini";
import { ZipExporter } from "@/lib/events/ZipExporter";
import { saveBlob } from "@/lib/tauri/TauriBridge";
import { TIPOS_DE_ATIVIDADE } from "@/lib/cert/Catalogs";
import { FontSelect } from "@/components/cert/FontSelect";
import { isValidAccessKey } from "@/lib/events/apiConfig";
import { ArrowLeft, Download, Loader2, Settings, Calendar, Users, Upload, X, ChevronDown, Lock } from "lucide-react";
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
      const accessKey = useEventStore.getState().apiConfig.accessKey;
      const blob = await exporter.export(evento, undefined, accessKey);
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
  // Fallback para eventos antigos que não têm qrCode ou campos novos de appearance
  // (valores em sistema centrado — delta do centro da imagem)
  const qrDefaults = { enabled: true, size: 130, style: "rounded" as const, posX: 830, posY: 537, showLabel: true, fgColor: "#1a1612", bgColor: "transparent" };
  const qr = evento.qrCode ?? qrDefaults;
  const fontColor = evento.appearance.fontColor ?? "#000000";
  const letterSpacing = evento.appearance.letterSpacing ?? 0;
  const lineHeight = evento.appearance.lineHeight ?? 1.5;
  const accessKey = useEventStore((s) => s.apiConfig.accessKey);
  const hasAccessKey = isValidAccessKey(accessKey);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="mr-1.5 h-4 w-4" /> Ajustes
        </Button>
      </DialogTrigger>
      <DialogContent
        className="glass-strong w-[95vw] max-w-[1400px] overflow-hidden p-5"
        style={{ height: `${Math.round(window.innerHeight * 0.88)}px`, maxHeight: `${Math.round(window.innerHeight * 0.88)}px`, minHeight: "500px", display: "flex", flexDirection: "column", position: "fixed", top: "6vh", left: "0", right: "0", margin: "0 auto", translate: "none", transform: "none" }}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Configurações do evento</DialogTitle>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,440px)_1fr]">
          {/* Coluna de configurações (rolável) */}
          <div className="space-y-4 overflow-y-auto scroll-mac pr-2">
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

          {/* Aparência — collapsible */}
          <Collapsible defaultOpen={true}>
            <CollapsibleTrigger className="flex w-full items-center gap-2 border-t border-border/60 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown className="h-3.5 w-3.5 [[data-state=open]>&]:rotate-180 transition-transform" />
              Aparência do certificado
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-4 pt-3">
                {/* Linha 1: Fonte + Tamanho */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Fonte</Label>
                    <FontSelect
                      value={evento.appearance.fontName}
                      onChange={(id) => onUpdate(evento.id, { appearance: { ...evento.appearance, fontName: id } })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>Tamanho</Label>
                      <span className="text-xs text-muted-foreground">{evento.appearance.fontSize} pt</span>
                    </div>
                    <Slider
                      value={[evento.appearance.fontSize]}
                      min={20} max={120} step={1}
                      onValueChange={(v) => onUpdate(evento.id, { appearance: { ...evento.appearance, fontSize: v[0] } })}
                    />
                  </div>
                </div>

                {/* Posição do texto — sistema centrado (0 = centro absoluto da imagem) */}
                <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Posição do texto</span>
                    <span className="text-[10px] text-muted-foreground/80">0 = centro da imagem</span>
                  </div>
                  <LabeledSlider label="Horizontal (X)" value={evento.appearance.posX} min={-1000} max={1000} step={5} suffix=" px"
                    onValueChange={(v) => onUpdate(evento.id, { appearance: { ...evento.appearance, posX: v } })}
                  />
                  <LabeledSlider label="Vertical (Y)" value={evento.appearance.posY} min={-700} max={700} step={5} suffix=" px"
                    hint="Delta do centro até o topo do bloco de texto (texto desce a partir daí)."
                    onValueChange={(v) => onUpdate(evento.id, { appearance: { ...evento.appearance, posY: v } })}
                  />
                  <LabeledSlider label="Largura do bloco" value={evento.appearance.textWidth ?? 1500} min={0} max={2000} step={10} suffix=" px"
                    hint="Largura total do bloco de texto, centrada em (centroX + posX). 0 = concentrado no centro."
                    onValueChange={(v) => onUpdate(evento.id, { appearance: { ...evento.appearance, textWidth: v } })}
                  />
                </div>

                {/* Itálico */}
                <div className="flex items-center space-x-2">
                  <Checkbox id="s-italic" checked={evento.appearance.useItalic}
                    onCheckedChange={(v) => onUpdate(evento.id, { appearance: { ...evento.appearance, useItalic: Boolean(v) } })}
                  />
                  <Label htmlFor="s-italic" className="cursor-pointer">Itálico no nome do evento/trabalho</Label>
                </div>

                {/* Cor + Espaçamento + Altura linha */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Cor da fonte</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={fontColor}
                        onChange={(e) => onUpdate(evento.id, { appearance: { ...evento.appearance, fontColor: e.target.value } })}
                        className="h-8 w-12 cursor-pointer rounded border border-border"
                      />
                      <Input value={fontColor} className="font-mono text-xs"
                        onChange={(e) => onUpdate(evento.id, { appearance: { ...evento.appearance, fontColor: e.target.value } })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Espaçamento</Label>
                    <Input type="number" min={-5} max={20} step={0.5} value={letterSpacing}
                      onChange={(e) => onUpdate(evento.id, { appearance: { ...evento.appearance, letterSpacing: Number(e.target.value) } })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Altura linha</Label>
                    <Input type="number" min={1} max={3} step={0.1} value={lineHeight}
                      onChange={(e) => onUpdate(evento.id, { appearance: { ...evento.appearance, lineHeight: Number(e.target.value) } })}
                    />
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Assinatura digital — collapsible com toggle */}
          <Collapsible defaultOpen={evento.signature.useSignature}>
            <div className="flex items-center justify-between border-t border-border/60 pt-4">
              <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className="h-3.5 w-3.5 [[data-state=open]>&]:rotate-180 transition-transform" />
                Assinatura Digital
              </CollapsibleTrigger>
              <Checkbox
                checked={evento.signature.useSignature}
                onCheckedChange={(v) =>
                  onUpdate(evento.id, { signature: { ...evento.signature, useSignature: Boolean(v) } })
                }
              />
            </div>
            <CollapsibleContent>
              <div className="space-y-3 pt-3">
                {evento.signature.useSignature ? (
                  <>
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer">
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent">
                          <Upload className="h-3.5 w-3.5" /> Carregar assinatura
                        </span>
                        <input type="file" accept="image/png,image/jpeg" className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              const reader = new FileReader();
                              reader.onload = () => onUpdate(evento.id, { signature: { ...evento.signature, signatureName: f.name, signatureDataUrl: reader.result as string } });
                              reader.readAsDataURL(f);
                            }
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {evento.signature.signatureDataUrl && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => onUpdate(evento.id, { signature: { ...evento.signature, signatureName: "", signatureDataUrl: null } })}>
                          <X className="mr-1 h-3.5 w-3.5" /> Remover
                        </Button>
                      )}
                    </div>
                    {evento.signature.signatureDataUrl && (
                      <div className="rounded-md border border-border bg-muted/30 p-2">
                        <img src={evento.signature.signatureDataUrl} alt="Assinatura" className="max-h-16 object-contain" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Tamanho</Label>
                        <span className="text-xs text-muted-foreground">{evento.signature.signatureSize} px</span>
                      </div>
                      <Slider value={[evento.signature.signatureSize]} min={50} max={1000} step={10}
                        onValueChange={(v) => onUpdate(evento.id, { signature: { ...evento.signature, signatureSize: v[0] } })}
                      />
                    </div>
                    <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Posição da assinatura</span>
                        <span className="text-[10px] text-muted-foreground/80">0 = centro da imagem</span>
                      </div>
                      <LabeledSlider label="Horizontal (X)" value={evento.signature.signaturePosX} min={-1000} max={1000} step={5} suffix=" px"
                        onValueChange={(v) => onUpdate(evento.id, { signature: { ...evento.signature, signaturePosX: v } })}
                      />
                      <LabeledSlider label="Vertical (Y)" value={evento.signature.signaturePosY} min={-700} max={700} step={5} suffix=" px"
                        onValueChange={(v) => onUpdate(evento.id, { signature: { ...evento.signature, signaturePosY: v } })}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Arraste a assinatura no preview para reposicioná-la.</p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Habilite o toggle acima para configurar a assinatura.</p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* QR Code — obrigatório (mas requer access key) */}
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="flex w-full items-center gap-2 border-t border-border/60 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown className="h-3.5 w-3.5 [[data-state=open]>&]:rotate-180 transition-transform" />
              QR Code de Validação
              {!hasAccessKey && <Lock className="ml-auto h-3 w-3 text-muted-foreground/50" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-3 pt-3">
                {!hasAccessKey && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Lock className="h-3 w-3" />
                      QR Code desativado
                    </div>
                    <p className="mt-1 text-amber-600/80 dark:text-amber-400/80">
                      Configure uma chave de acesso em Configurações → Validação Online para ativar o QR code.
                    </p>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Estilo</Label>
                  <Select value={qr.style ?? "rounded"}
                    onValueChange={(v) => onUpdate(evento.id, { qrCode: { ...qrDefaults, ...qr, style: v as "classic" | "rounded" | "dots" | "minimal" } })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classic">Clássico (quadrados)</SelectItem>
                      <SelectItem value="rounded">Arredondado</SelectItem>
                      <SelectItem value="dots">Pontos</SelectItem>
                      <SelectItem value="minimal">Minimalista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Tamanho</Label>
                    <span className="text-xs text-muted-foreground">{qr.size ?? 130} px</span>
                  </div>
                  <Slider value={[qr.size ?? 130]} min={60} max={400} step={10}
                    onValueChange={(v) => onUpdate(evento.id, { qrCode: { ...qrDefaults, ...qr, size: v[0] } })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Cor dos módulos</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={qr.fgColor ?? "#1a1612"}
                        onChange={(e) => onUpdate(evento.id, { qrCode: { ...qrDefaults, ...qr, fgColor: e.target.value } })}
                        className="h-8 w-12 cursor-pointer rounded border border-border"
                      />
                      <Input value={qr.fgColor ?? "#1a1612"} className="font-mono text-xs"
                        onChange={(e) => onUpdate(evento.id, { qrCode: { ...qrDefaults, ...qr, fgColor: e.target.value } })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cor de fundo</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={qr.bgColor ?? "#ffffff"}
                        onChange={(e) => onUpdate(evento.id, { qrCode: { ...qrDefaults, ...qr, bgColor: e.target.value } })}
                        className="h-8 w-12 cursor-pointer rounded border border-border"
                      />
                      <Input value={qr.bgColor ?? "#ffffff"} className="font-mono text-xs"
                        onChange={(e) => onUpdate(evento.id, { qrCode: { ...qrDefaults, ...qr, bgColor: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Posição do QR code</span>
                    <span className="text-[10px] text-muted-foreground/80">0 = centro da imagem</span>
                  </div>
                  <LabeledSlider label="Horizontal (X)" value={qr.posX ?? 830} min={-1000} max={1000} step={5} suffix=" px"
                    onValueChange={(v) => onUpdate(evento.id, { qrCode: { ...qrDefaults, ...qr, posX: v } })}
                  />
                  <LabeledSlider label="Vertical (Y)" value={qr.posY ?? 537} min={-700} max={700} step={5} suffix=" px"
                    onValueChange={(v) => onUpdate(evento.id, { qrCode: { ...qrDefaults, ...qr, posY: v } })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="s-qr-label" checked={qr.showLabel ?? true}
                    onCheckedChange={(v) => onUpdate(evento.id, { qrCode: { ...qrDefaults, ...qr, showLabel: Boolean(v) } })}
                  />
                  <Label htmlFor="s-qr-label" className="cursor-pointer">Mostrar texto "Valide em" abaixo do QR</Label>
                </div>
                <p className="text-xs text-muted-foreground">Arraste o QR code no preview para reposicioná-lo.</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
          </div>

          {/* Coluna de preview ao vivo */}
          <div className="flex min-h-0 flex-col overflow-hidden">
            <h4 className="mb-2 flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pré-visualização
            </h4>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <CertificatePreviewMini
                evento={evento}
                onUpdate={(patch) => onUpdate(evento.id, patch)}
              />
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
