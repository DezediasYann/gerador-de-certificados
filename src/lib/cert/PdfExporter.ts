// PdfExporter — converte um canvas renderizado em um PDF de uma página via jsPDF.
// O PDF é paisagem, com dimensões proporcionais ao canvas, para preservar a resolução.
import { jsPDF } from "jspdf";

export class PdfExporter {
  /**
   * Gera um PDF a partir de um canvas e dispara o download/save.
   * @param canvas  canvas já renderizado em resolução plena
   * @param filename  nome do arquivo (com extensão .pdf)
   * @returns o Blob gerado (útil para salvar via Tauri fs)
   */
  toBlob(canvas: HTMLCanvasElement, filename?: string): Blob {
    const pdf = this.buildPdf(canvas);
    return pdf.output("blob");
  }

  /** Gera o PDF e retorna o objeto jsPDF (para output flexível). */
  buildPdf(canvas: HTMLCanvasElement): jsPDF {
    const w = canvas.width;
    const h = canvas.height;
    const orientation = w >= h ? "landscape" : "portrait";
    // Usa o tamanho do template em pontos (1px ≈ 0.75pt); jsPDF aceita formato custom em pt
    const ptW = w * 0.75;
    const ptH = h * 0.75;
    const pdf = new jsPDF({
      orientation,
      unit: "pt",
      format: [ptW, ptH],
      compress: true,
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    pdf.addImage(imgData, "JPEG", 0, 0, ptW, ptH);
    return pdf;
  }

  /** Gera um nome padrão no formato NOME-FUNCAO.pdf (espelhando o original). */
  static defaultFilename(nome: string, funcao: string): string {
    const nomeF = (nome || "certificado").toUpperCase().replace(/\s+/g, "_");
    const funcF = (funcao || "").toUpperCase().replace(/\(A\)/g, "").replace(/\s+/g, "_");
    return `${nomeF}-${funcF}.pdf`;
  }
}
