"use client";
import { useEffect, useState } from "react";
import { useCertStore } from "@/store/cert-store";
import { AVAILABLE_FONTS } from "@/lib/cert/Catalogs";
import { PreferencesStore } from "@/lib/storage/PreferencesStore";
import { openImage } from "@/lib/tauri/TauriBridge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X } from "lucide-react";

/** Aba Ajustes — aparência, assinatura digital e atualizações. */
export function SettingsPanel() {
  const s = useCertStore();
  const prefsRef = new PreferencesStore();
  const [betaLoaded, setBetaLoaded] = useState(false);

  // Carrega preferência de beta uma vez
  useEffect(() => {
    (async () => {
      const beta = await prefsRef.get<boolean>("beta_updates", false);
      s.set({ betaUpdates: beta });
      setBetaLoaded(true);
    })();
  }, []);

  const toggleBeta = async (v: boolean) => {
    s.set({ betaUpdates: v });
    await prefsRef.set("beta_updates", v);
  };

  const handleSelectSignature = async () => {
    const result = await openImage();
    if (result) {
      s.loadSignature(result.name, result.url);
      if (!s.useSignature) s.set({ useSignature: true });
    }
  };

  return (
    <div className="space-y-6">
      {/* Aparência */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Aparência</h3>

        <div className="space-y-2">
          <Label>Modelo (template)</Label>
          <Input value={s.templateName} disabled className="bg-muted/40" />
          <p className="text-xs text-muted-foreground">
            Coloque imagens em <code className="rounded bg-muted px-1">public/models/</code> para adicioná-las.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Fonte</Label>
          <Select value={s.fontName} onValueChange={(v) => s.set({ fontName: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_FONTS.map((f) => (
                <SelectItem key={f.name} value={f.name}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Tamanho da fonte</Label>
            <span className="text-xs text-muted-foreground">{s.fontSize} pt</span>
          </div>
          <Slider
            value={[s.fontSize]}
            min={20}
            max={120}
            step={1}
            onValueChange={(v) => s.set({ fontSize: v[0] })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Posição X</Label>
            <Input
              type="number"
              min={0}
              max={4000}
              value={s.posX}
              onChange={(e) => s.set({ posX: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Posição Y</Label>
            <Input
              type="number"
              min={0}
              max={4000}
              value={s.posY}
              onChange={(e) => s.set({ posY: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="italic"
            checked={s.useItalic}
            onCheckedChange={(v) => s.set({ useItalic: Boolean(v) })}
          />
          <Label htmlFor="italic" className="cursor-pointer">
            Itálico no nome do evento/trabalho
          </Label>
        </div>
      </section>

      {/* Assinatura digital */}
      <section className="space-y-4 border-t border-border/60 pt-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Assinatura Digital</h3>
          <Checkbox
            id="useSignature"
            checked={s.useSignature}
            onCheckedChange={(v) => s.set({ useSignature: Boolean(v) })}
          />
        </div>

        {s.useSignature && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectSignature}
              >
                <Upload className="mr-1.5 h-4 w-4" /> Carregar imagem…
              </Button>
              {s.signatureUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => s.clearSignature()}
                >
                  <X className="mr-1.5 h-4 w-4" /> Remover
                </Button>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {s.signatureName || "Nenhuma imagem selecionada"}
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tamanho</Label>
                <span className="text-xs text-muted-foreground">{s.signatureSize} px</span>
              </div>
              <Slider
                value={[s.signatureSize]}
                min={50}
                max={1000}
                step={10}
                onValueChange={(v) => s.set({ signatureSize: v[0] })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Pos. X</Label>
                <Input
                  type="number"
                  min={0}
                  max={4000}
                  value={s.signaturePosX}
                  onChange={(e) => s.set({ signaturePosX: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Pos. Y</Label>
                <Input
                  type="number"
                  min={0}
                  max={4000}
                  value={s.signaturePosY}
                  onChange={(e) => s.set({ signaturePosY: Number(e.target.value) })}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Dica: arraste a assinatura diretamente sobre a pré-visualização.
            </p>
          </div>
        )}
      </section>

      {/* Atualizações */}
      <section className="space-y-3 border-t border-border/60 pt-5">
        <h3 className="text-sm font-semibold text-foreground">Atualizações</h3>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="beta"
            checked={betaLoaded && s.betaUpdates}
            onCheckedChange={(v) => toggleBeta(Boolean(v))}
            disabled={!betaLoaded}
          />
          <Label htmlFor="beta" className="cursor-pointer">
            Receber atualizações de teste (pre-release)
          </Label>
        </div>
      </section>
    </div>
  );
}
