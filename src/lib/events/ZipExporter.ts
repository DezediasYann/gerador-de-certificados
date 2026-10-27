// ZipExporter — gera um ZIP com vários PDFs de certificados (em memória).
// Usado pelo botão "Baixar todos (ZIP)" na tela do evento.
import JSZip from "jszip";
import type { Evento, Participante } from "./types";
import { CertificateEngine } from "../cert/CertificateEngine";
import { FontManager } from "../cert/FontManager";
import { PdfExporter } from "../cert/PdfExporter";
import { TextComposer } from "../cert/TextComposer";
import { templateUrlOf } from "./types";
import type { CertificateInput } from "../cert/types";

export interface ZipProgress {
  current: number;
  total: number;
  currentName: string;
}

export class ZipExporter {
  /**
   * Gera um ZIP com um PDF por participante.
   * @param evento  evento com participantes e configurações
   * @param onProgress  callback de progresso (opcional)
   * @returns Blob do ZIP
   */
  async export(
    evento: Evento,
    onProgress?: (p: ZipProgress) => void,
  ): Promise<Blob> {
    const zip = new JSZip();
    const total = evento.participantes.length;

    // Pré-carrega recursos compartilhados
    const templateUrl = templateUrlOf(evento);
    const template = await loadImage(templateUrl);
    const signature =
      evento.signature.useSignature && evento.signature.signatureDataUrl
        ? await loadImage(evento.signature.signatureDataUrl)
        : null;
    const fontLoader = FontManager.instance;
    const fonts = await fontLoader.load(evento.appearance.fontName);

    // Canvas reutilizado
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponível");
    const engine = new CertificateEngine(ctx);
    const exporter = new PdfExporter();

    const usedNames = new Set<string>();

    for (let i = 0; i < total; i++) {
      const p = evento.participantes[i];
      const filename = this.uniqueName(p, evento, usedNames);
      onProgress?.({ current: i, total, currentName: filename });

      try {
        const input = this.toCertificateInput(evento, p);
        await engine.render(input, template, fonts, signature);
        const pdfBlob = exporter.toBlob(canvas, filename);
        const bytes = new Uint8Array(await pdfBlob.arrayBuffer());
        zip.file(filename, bytes);
      } catch (err) {
        // Registra erro como txt no zip para diagnóstico
        zip.file(
          `${filename}.erro.txt`,
          `Erro ao gerar: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      // Permite o navegador respirar entre iterações
      await new Promise((r) => setTimeout(r, 0));
    }

    onProgress?.({ current: total, total, currentName: "" });
    return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  }

  /** Converte um participante + evento em CertificateInput. */
  private toCertificateInput(evento: Evento, p: Participante): CertificateInput {
    const funcao = p.funcao === "Outro" ? p.funcaoCustom : p.funcao;
    const composer = new TextComposer();
    const cargaHoraria = p.cargaHoraria || evento.cargaHorariaPadrao || "";
    return {
      nome: p.nome,
      funcaoParticipante: funcao,
      docTipo: p.docTipo,
      docNumero: p.docNumero,
      nomeTrabalho: p.nomeTrabalho,
      tipoAtividade: evento.tipoAtividade,
      nomeEvento: evento.nomeEvento,
      cargaHoraria,
      useDate: evento.useDate,
      dataInicio: evento.dataInicio,
      dataFim: evento.dataFim,
      templateName: evento.templateName,
      templateUrl: templateUrlOf(evento),
      fontName: evento.appearance.fontName,
      fontSize: evento.appearance.fontSize,
      useItalic: evento.appearance.useItalic,
      posX: evento.appearance.posX,
      posY: evento.appearance.posY,
      useSignature: evento.signature.useSignature,
      signaturePath: evento.signature.signatureDataUrl,
      signaturePosX: evento.signature.signaturePosX,
      signaturePosY: evento.signature.signaturePosY,
      signatureSize: evento.signature.signatureSize,
    };
    // composer é instanciado só para garantir tree-shaking do módulo; não usado aqui.
    void composer;
  }

  /** Gera nome único para o PDF dentro do zip. */
  private uniqueName(p: Participante, evento: Evento, used: Set<string>): string {
    const nomeF = (p.nome || "certificado").toUpperCase().replace(/\s+/g, "_");
    const funcF = (p.funcao === "Outro" ? p.funcaoCustom : p.funcao || "")
      .toUpperCase()
      .replace(/\(A\)/g, "")
      .replace(/\s+/g, "_");
    const base = `${nomeF}-${funcF}`;
    let name = `${base}.pdf`;
    let idx = 1;
    while (used.has(name)) {
      name = `${base}_${idx}.pdf`;
      idx++;
    }
    used.add(name);
    return name;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${src.slice(0, 60)}`));
    img.src = src;
  });
}
