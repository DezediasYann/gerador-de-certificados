"use client";
import { useState } from "react";
import { useEventStore } from "@/store/event-store";
import { GlassPanel } from "@/components/macos/GlassPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIPOS_DE_ATIVIDADE } from "@/lib/cert/Catalogs";
import { TemplateCatalog } from "@/lib/events/TemplateCatalog";
import { FontSelect } from "@/components/cert/FontSelect";
import { WizardPreview } from "./WizardPreview";
import { ArrowLeft, ArrowRight, Check, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Wizard de criação de evento em 2 etapas. */
export function EventWizard() {
  const step = useEventStore((s) => s.wizardStep);
  const draft = useEventStore((s) => s.wizardDraft);
  const setStep = useEventStore((s) => s.setWizardStep);
  const updateDraft = useEventStore((s) => s.updateWizardDraft);
  const finishWizard = useEventStore((s) => s.finishWizard);
  const goHome = useEventStore((s) => s.goHome);
  const [submitting, setSubmitting] = useState(false);

  if (!draft) return null;

  const hasTemplate = Boolean(draft.templateDataUrl);
  const canAdvanceStep1 = Boolean(draft.nome.trim()) && hasTemplate;

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      await finishWizard();
      toast.success("Evento criado com sucesso!");
    } catch (err) {
      toast.error("Erro ao criar evento", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
      <div className="mb-5 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={goHome}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Cancelar
        </Button>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Novo evento</h2>
      </div>

      {/* Stepper */}
      <div className="mb-5 flex items-center gap-2">
        <StepDot active={step >= 1} done={step > 1} n={1} label="Informações" />
        <div className={cn("h-px flex-1", step >= 2 ? "bg-primary" : "bg-border")} />
        <StepDot active={step >= 2} n={2} label="Certificado" />
      </div>

      {step === 1 && (
        <div className="mx-auto max-w-2xl">
          <GlassPanel className="space-y-5 p-6">
            <div className="space-y-2">
              <Label htmlFor="ev-nome">Nome do evento *</Label>
              <Input
                id="ev-nome"
                value={draft.nome}
                onChange={(e) => updateDraft({ nome: e.target.value, nomeEvento: e.target.value })}
                placeholder="Ex.: VII Semana de História"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Este nome também aparece no certificado. Você poderá editá-lo depois.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ev-tipo">Tipo de atividade</Label>
              <Select
                value={draft.tipoAtividade}
                onValueChange={(v) => updateDraft({ tipoAtividade: v })}
              >
                <SelectTrigger id="ev-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DE_ATIVIDADE.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Template do certificado *</Label>
              <p className="text-xs text-muted-foreground">
                Carregue a imagem do template (PNG/JPG). Esta imagem aparece como capa do evento
                e como fundo do certificado.
              </p>
              <TemplateUploader
                draft={draft}
                onUpload={async (file) => {
                  const dataUrl = await TemplateCatalog.fileToDataUrl(file);
                  updateDraft({
                    templateSource: "upload",
                    templateName: file.name,
                    templateDataUrl: dataUrl,
                  });
                }}
                onClear={() =>
                  updateDraft({
                    templateSource: "upload",
                    templateName: "",
                    templateDataUrl: null,
                  })
                }
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => setStep(2)}
                disabled={!canAdvanceStep1}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Continuar <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </GlassPanel>
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
          {/* Coluna de configurações */}
          <GlassPanel className="space-y-6 p-5">
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Aparência do certificado</h3>

              <div className="space-y-2">
                <Label>Fonte</Label>
                <FontSelect
                  value={draft.appearance.fontName}
                  onChange={(id) =>
                    updateDraft({ appearance: { ...draft.appearance, fontName: id } })
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Tamanho</Label>
                  <span className="text-xs text-muted-foreground">{draft.appearance.fontSize} pt</span>
                </div>
                <Slider
                  value={[draft.appearance.fontSize]}
                  min={20}
                  max={120}
                  step={1}
                  onValueChange={(v) =>
                    updateDraft({ appearance: { ...draft.appearance, fontSize: v[0] } })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Posição X</Label>
                  <Input
                    type="number"
                    min={0}
                    max={4000}
                    value={draft.appearance.posX}
                    onChange={(e) =>
                      updateDraft({
                        appearance: { ...draft.appearance, posX: Number(e.target.value) },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Posição Y</Label>
                  <Input
                    type="number"
                    min={0}
                    max={4000}
                    value={draft.appearance.posY}
                    onChange={(e) =>
                      updateDraft({
                        appearance: { ...draft.appearance, posY: Number(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ev-italic"
                  checked={draft.appearance.useItalic}
                  onCheckedChange={(v) =>
                    updateDraft({
                      appearance: { ...draft.appearance, useItalic: Boolean(v) },
                    })
                  }
                />
                <Label htmlFor="ev-italic" className="cursor-pointer">
                  Itálico no nome do evento/trabalho
                </Label>
              </div>
            </section>

            {/* Assinatura */}
            <section className="space-y-3 border-t border-border/60 pt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Assinatura digital</h3>
                <Checkbox
                  id="ev-sig"
                  checked={draft.signature.useSignature}
                  onCheckedChange={(v) =>
                    updateDraft({
                      signature: { ...draft.signature, useSignature: Boolean(v) },
                    })
                  }
                />
              </div>

              {draft.signature.useSignature && (
                <SignaturePicker
                  draft={draft}
                  onUpload={async (file) => {
                    const dataUrl = await TemplateCatalog.fileToDataUrl(file);
                    updateDraft({
                      signature: {
                        ...draft.signature,
                        signatureName: file.name,
                        signatureDataUrl: dataUrl,
                      },
                    });
                  }}
                  onClear={() =>
                    updateDraft({
                      signature: {
                        ...draft.signature,
                        signatureName: "",
                        signatureDataUrl: null,
                      },
                    })
                  }
                  onChangeSize={(size) =>
                    updateDraft({
                      signature: { ...draft.signature, signatureSize: size },
                    })
                  }
                  onChangePos={(x, y) =>
                    updateDraft({
                      signature: { ...draft.signature, signaturePosX: x, signaturePosY: y },
                    })
                  }
                />
              )}
            </section>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
              </Button>
              <Button
                onClick={handleFinish}
                disabled={submitting}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Check className="mr-1.5 h-4 w-4" /> Criar evento
              </Button>
            </div>
          </GlassPanel>

          {/* Coluna de preview ao vivo */}
          <GlassPanel className="flex flex-col p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-foreground">Pré-visualização ao vivo</h3>
              <span className="text-xs text-muted-foreground">
                Ajuste a assinatura arrastando-a sobre o preview
              </span>
            </div>
            <WizardPreview
              draft={draft}
              onSignaturePosChange={(x, y) =>
                updateDraft({
                  signature: { ...draft.signature, signaturePosX: x, signaturePosY: y },
                })
              }
            />
          </GlassPanel>
        </div>
      )}
    </div>
  );
}

function StepDot({ active, done, n, label }: { active: boolean; done: boolean; n: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
          done || active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {done ? <Check className="h-3.5 w-3.5" /> : n}
      </div>
      <span className={cn("text-xs font-medium", active ? "text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
    </div>
  );
}

/** Uploader de template (substitui a grade de bundled). */
function TemplateUploader({
  draft,
  onUpload,
  onClear,
}: {
  draft: { templateDataUrl: string | null; templateName: string };
  onUpload: (file: File) => void;
  onClear: () => void;
}) {
  const has = Boolean(draft.templateDataUrl);
  return (
    <div className="space-y-3">
      {!has ? (
        <label className="flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 transition-all hover:border-primary/50 hover:bg-primary/5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Upload className="h-5 w-5 text-muted-foreground" />
          </div>
          <span className="text-sm font-medium text-foreground">Carregar template</span>
          <span className="text-xs text-muted-foreground">PNG ou JPG</span>
          <input
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
          />
        </label>
      ) : (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-lg border border-border">
            <img src={draft.templateDataUrl!} alt="Template" className="max-h-48 w-full object-cover" />
            <button
              type="button"
              onClick={onClear}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label="Remover template"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="truncate text-xs text-muted-foreground">{draft.templateName}</p>
        </div>
      )}
    </div>
  );
}

/** Seletor de assinatura. */
function SignaturePicker({
  draft,
  onUpload,
  onClear,
  onChangeSize,
  onChangePos,
}: {
  draft: { signature: { signatureName: string; signatureDataUrl: string | null; signatureSize: number; signaturePosX: number; signaturePosY: number } };
  onUpload: (file: File) => void;
  onClear: () => void;
  onChangeSize: (size: number) => void;
  onChangePos: (x: number, y: number) => void;
}) {
  const sig = draft.signature;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="cursor-pointer">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent">
            <Upload className="h-3.5 w-3.5" /> Carregar imagem
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
          />
        </label>
        {sig.signatureDataUrl && (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            <X className="mr-1 h-3.5 w-3.5" /> Remover
          </Button>
        )}
      </div>
      <p className="truncate text-xs text-muted-foreground">
        {sig.signatureName || "Nenhuma imagem selecionada"}
      </p>
      {sig.signatureDataUrl && (
        <div className="rounded-md border border-border bg-muted/30 p-2">
          <img src={sig.signatureDataUrl} alt="Assinatura" className="max-h-16 object-contain" />
        </div>
      )}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Tamanho</Label>
          <span className="text-xs text-muted-foreground">{sig.signatureSize} px</span>
        </div>
        <Slider
          value={[sig.signatureSize]}
          min={50}
          max={1000}
          step={10}
          onValueChange={(v) => onChangeSize(v[0])}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Pos. X</Label>
          <Input
            type="number"
            min={0}
            max={4000}
            value={sig.signaturePosX}
            onChange={(e) => onChangePos(Number(e.target.value), sig.signaturePosY)}
          />
        </div>
        <div className="space-y-2">
          <Label>Pos. Y</Label>
          <Input
            type="number"
            min={0}
            max={4000}
            value={sig.signaturePosY}
            onChange={(e) => onChangePos(sig.signaturePosX, Number(e.target.value))}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Dica: arraste a assinatura diretamente sobre o preview ao lado para posicioná-la.
      </p>
    </div>
  );
}
