"use client";
import { useState } from "react";
import { FontManager } from "@/lib/cert/FontManager";
import type { CustomFont } from "@/lib/cert/FontManager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FontImportDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported: (font: CustomFont) => void;
}

/** Diálogo para importar uma fonte customizada (regular + opcional itálico). */
export function FontImportDialog({ open, onOpenChange, onImported }: FontImportDialogProps) {
  const [regularFile, setRegularFile] = useState<File | null>(null);
  const [italicFile, setItalicFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setRegularFile(null);
    setItalicFile(null);
    setLoading(false);
    onOpenChange(false);
  };

  const handleImport = async () => {
    if (!regularFile) {
      toast.warning("Selecione o arquivo regular (.ttf).");
      return;
    }
    setLoading(true);
    try {
      const font = await FontManager.instance.addCustom(regularFile, italicFile);
      onImported(font);
      reset();
    } catch (err) {
      toast.error("Erro ao importar fonte", {
        description: err instanceof Error ? err.message : undefined,
      });
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && reset()}>
      <DialogContent className="glass-strong max-w-md">
        <DialogHeader>
          <DialogTitle>Importar fonte</DialogTitle>
          <DialogDescription>
            Carregue um arquivo de fonte TrueType (.ttf). O itálico é opcional — se não fornecido,
            o regular será usado no lugar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <FilePicker
            label="Fonte regular *"
            file={regularFile}
            onPick={setRegularFile}
          />
          <FilePicker
            label="Fonte itálica (opcional)"
            file={italicFile}
            onPick={setItalicFile}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={reset} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={loading || !regularFile}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FilePicker({
  label,
  file,
  onPick,
}: {
  label: string;
  file: File | null;
  onPick: (f: File | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <label className="cursor-pointer">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent">
            <Upload className="h-3.5 w-3.5" /> Escolher arquivo
          </span>
          <input
            type="file"
            accept=".ttf,.otf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPick(f);
              e.target.value = "";
            }}
          />
        </label>
        {file && (
          <>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{file.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onPick(null)}
              aria-label="Remover"
            >
              <X className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
