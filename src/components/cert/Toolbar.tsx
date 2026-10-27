"use client";
import { useState } from "react";
import { useCertStore } from "@/store/cert-store";
import { CertificateEngine } from "@/lib/cert/CertificateEngine";
import { FontLoader } from "@/lib/cert/FontLoader";
import { PdfExporter } from "@/lib/cert/PdfExporter";
import { ExcelBatchProcessor } from "@/lib/cert/ExcelBatchProcessor";
import { saveBlob, openFile, openDirectory, writeFileToPath, isTauri } from "@/lib/tauri/TauriBridge";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileStack, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BatchDialog } from "./BatchDialog";

/** Rodapé com as 3 ações principais: modelo Excel, lote, gerar PDF individual. */
export function Toolbar() {
  const s = useCertStore();
  const [busy, setBusy] = useState<"pdf" | "excel" | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const fontLoaderRef = new FontLoader();

  const handleGeneratePdf = async () => {
    // Validações
    const funcao = s.getFuncaoParticipante();
    if (!s.nome || !s.tipoAtividade || !s.cargaHoraria || !funcao) {
      toast.warning("Preencha todos os campos obrigatórios do participante e evento.");
      return;
    }
    if (s.useSignature && !s.signatureUrl) {
      toast.warning("Habilite a assinatura mas não selecionou a imagem. Ajuste na aba Ajustes.");
      return;
    }

    setBusy("pdf");
    try {
      // Renderiza em canvas pleno (fora do DOM)
      const input = s.toCertificateInput(false);
      const template = await loadImage(input.templateUrl);
      const signature = input.useSignature && input.signaturePath
        ? await loadImage(input.signaturePath)
        : null;
      const fonts = await fontLoaderRef.load(input.fontName);

      const fullCanvas = document.createElement("canvas");
      const ctx = fullCanvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D indisponível");
      const engine = new CertificateEngine(ctx);
      await engine.render(input, template, fonts, signature);

      const exporter = new PdfExporter();
      const blob = exporter.toBlob(fullCanvas);
      const defaultName = PdfExporter.defaultFilename(s.nome, funcao);
      const saved = await saveBlob(blob, defaultName, [
        { name: "PDF", extensions: ["pdf"] },
      ]);
      if (saved) toast.success(`Certificado salvo: ${saved}`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  };

  const handleDownloadTemplate = async () => {
    setBusy("excel");
    try {
      const processor = new ExcelBatchProcessor();
      const blob = processor.createTemplateBlob();
      const saved = await saveBlob(blob, "modelo_importacao.xlsx", [
        { name: "Excel", extensions: ["xlsx"] },
      ]);
      if (saved) toast.success("Modelo Excel salvo.");
    } catch (err) {
      toast.error("Erro ao gerar modelo", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownloadTemplate}
          disabled={busy !== null}
          className="text-muted-foreground underline-offset-2 hover:underline"
        >
          {busy === "excel" ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="mr-1.5 h-4 w-4" />
          )}
          Baixar modelo Excel
        </Button>

        <div className="flex-1" />

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setBatchOpen(true)}
          disabled={busy !== null}
        >
          <FileStack className="mr-1.5 h-4 w-4" />
          Gerar em lote
        </Button>

        <Button
          size="sm"
          onClick={handleGeneratePdf}
          disabled={busy !== null}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {busy === "pdf" ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="mr-1.5 h-4 w-4" />
          )}
          Gerar certificado PDF
        </Button>
      </div>

      <BatchDialog open={batchOpen} onOpenChange={setBatchOpen} />
    </>
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

// Reexporta utilitários de Tauri usados pelo BatchDialog
export { openFile, openDirectory, writeFileToPath, isTauri };
