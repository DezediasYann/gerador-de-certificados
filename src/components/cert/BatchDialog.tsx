"use client";
import { useState } from "react";
import { useCertStore } from "@/store/cert-store";
import { CertificateEngine } from "@/lib/cert/CertificateEngine";
import { FontLoader } from "@/lib/cert/FontLoader";
import { PdfExporter } from "@/lib/cert/PdfExporter";
import { ExcelBatchProcessor } from "@/lib/cert/ExcelBatchProcessor";
import { saveBlob, openFile, openDirectory, writeFileToPath, isTauri } from "@/lib/tauri/TauriBridge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, FileStack, FolderOpen, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { BatchRow, GeneratedCert } from "@/lib/cert/types";

interface BatchDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Phase = "idle" | "selecting" | "processing" | "done";

/** Diálogo de geração em lote a partir de Excel/CSV. */
export function BatchDialog({ open, onOpenChange }: BatchDialogProps) {
  const s = useCertStore();
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [results, setResults] = useState<GeneratedCert[]>([]);

  const handleRun = async () => {
    // Validações básicas do evento comum
    const funcao = s.getFuncaoParticipante();
    if (!s.tipoAtividade || (!s.nomeEvento && s.funcao !== "Outro")) {
      toast.warning("Preencha os dados do Evento antes de processar o lote.");
      return;
    }
    if (s.useSignature && !s.signatureUrl) {
      toast.warning("Configure a assinatura na aba Ajustes antes do lote.");
      return;
    }

    setPhase("selecting");
    try {
      // 1. Abre planilha
      const fileRes = await openFile([
        { name: "Planilhas", extensions: ["xlsx", "csv"] },
      ]);
      if (!fileRes) {
        setPhase("idle");
        return;
      }
      const file = new File([fileRes.data], fileRes.name);

      // 2. Pasta de saída (Tauri) ou fallback (browser)
      let outDir: string | null = null;
      if (isTauri()) {
        outDir = await openDirectory();
        if (!outDir) {
          setPhase("idle");
          return;
        }
      }

      // 3. Lê linhas
      const processor = new ExcelBatchProcessor();
      const rows = await processor.readRows(file);
      if (rows.length === 0) {
        toast.warning("Nenhuma linha encontrada na planilha.");
        setPhase("idle");
        return;
      }

      // 4. Pré-carrega template + assinatura + fontes
      setPhase("processing");
      setTotal(rows.length);
      setProgress(0);
      setResults([]);

      const inputBase = s.toCertificateInput(false);
      const template = await loadImage(inputBase.templateUrl);
      const signature =
        inputBase.useSignature && inputBase.signaturePath
          ? await loadImage(inputBase.signaturePath)
          : null;
      const fontLoader = new FontLoader();
      const fonts = await fontLoader.load(inputBase.fontName);
      const exporter = new PdfExporter();

      // 5. Processa cada linha
      const usedNames = new Set<string>();
      const out: GeneratedCert[] = [];
      const ctxCanvas = document.createElement("canvas");
      const ctx = ctxCanvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D indisponível");
      const engine = new CertificateEngine(ctx);

      for (let i = 0; i < rows.length; i++) {
        const row: BatchRow = rows[i];
        // Nome único
        let name = ExcelBatchProcessor.buildFilename(row.nome, row.funcaoParticipante);
        let idx = 1;
        while (usedNames.has(name)) {
          name = ExcelBatchProcessor.buildFilename(row.nome, row.funcaoParticipante, idx);
          idx++;
        }
        usedNames.add(name);

        try {
          const rowInput = {
            ...inputBase,
            nome: row.nome,
            docTipo: row.docTipo,
            docNumero: row.docNumero,
            funcaoParticipante: row.funcaoParticipante,
            nomeTrabalho: row.nomeTrabalho,
          };
          await engine.render(rowInput, template, fonts, signature);
          const blob = exporter.toBlob(ctxCanvas, name);
          if (outDir) {
            const bytes = new Uint8Array(await blob.arrayBuffer());
            await writeFileToPath(`${outDir}/${name}`, bytes);
          } else {
            // Browser: dispara download de cada um
            await saveBlob(blob, name, [{ name: "PDF", extensions: ["pdf"] }]);
          }
          out.push({ filename: name, success: true });
        } catch (err) {
          out.push({
            filename: name,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
        setProgress(i + 1);
        // Permite o navegador respirar
        await new Promise((r) => setTimeout(r, 0));
      }

      setResults(out);
      setPhase("done");
      const okCount = out.filter((r) => r.success).length;
      toast.success(`${okCount}/${out.length} certificados gerados.`);
    } catch (err) {
      console.error(err);
      toast.error("Erro no processamento em lote", {
        description: err instanceof Error ? err.message : undefined,
      });
      setPhase("idle");
    }
  };

  const reset = () => {
    setPhase("idle");
    setProgress(0);
    setTotal(0);
    setResults([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && reset()}>
      <DialogContent className="glass-strong max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileStack className="h-5 w-5 text-primary" /> Gerar em lote
          </DialogTitle>
          <DialogDescription>
            Selecione uma planilha Excel/CSV com os participantes. Os dados do evento e aparência atuais
            (aba Evento + Ajustes) serão aplicados a todas as linhas.
          </DialogDescription>
        </DialogHeader>

        {phase === "idle" && (
          <div className="space-y-3 py-2 text-sm">
            <div className="rounded-lg bg-muted/50 p-3 text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">Colunas esperadas:</p>
              <ul className="list-disc space-y-0.5 pl-4 text-xs">
                <li>Nome da Pessoa</li>
                <li>Tipo de Documento (Nenhum/CPF/Matrícula)</li>
                <li>Nº do Documento</li>
                <li>Função do Participante</li>
                <li>Função Customizada (se Outro)</li>
                <li>Nome do Trabalho (se Apresentador)</li>
              </ul>
              <p className="mt-2 text-xs">
                Não tem o modelo? Clique em <strong>Baixar modelo Excel</strong> no rodapé.
              </p>
            </div>
          </div>
        )}

        {phase === "selecting" && (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Selecione o arquivo na janela que abriu…
          </div>
        )}

        {phase === "processing" && (
          <div className="space-y-3 py-2">
            <Progress value={total ? (progress / total) * 100 : 0} />
            <p className="text-center text-sm text-muted-foreground">
              Gerando {progress} de {total}…
            </p>
          </div>
        )}

        {phase === "done" && (
          <div className="max-h-72 space-y-2 overflow-y-auto scroll-mac py-2">
            {results.map((r, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-md border border-border/50 p-2 text-xs"
              >
                {r.success ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono">{r.filename}</p>
                  {r.error && <p className="text-destructive">{r.error}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          {phase === "idle" && (
            <>
              <Button variant="outline" onClick={reset}>
                Cancelar
              </Button>
              <Button onClick={handleRun} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <FolderOpen className="mr-1.5 h-4 w-4" /> Selecionar planilha
              </Button>
            </>
          )}
          {phase === "done" && (
            <Button onClick={reset}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${src}`));
    img.src = src;
  });
}
