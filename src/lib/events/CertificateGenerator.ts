// CertificateGenerator — gera um único PDF de certificado a partir de um evento + participante.
// Reaproveita CertificateEngine + PdfExporter.
import type { Evento, Participante } from "./types";
import { templateUrlOf } from "./types";
import { CertificateEngine, type QrDrawOptions } from "../cert/CertificateEngine";
import { FontManager } from "../cert/FontManager";
import { PdfExporter } from "../cert/PdfExporter";
import { ValidationRegistrar, type ValidationResult } from "./ValidationRegistrar";
import type { CertificateInput } from "../cert/types";

export class CertificateGenerator {
  /**
   * Gera o PDF de um participante e retorna o Blob.
   * @param evento  evento com configurações
   * @param participante  participante alvo
   * @returns Blob PDF + nome sugerido
   */
  async generate(
    evento: Evento,
    participante: Participante,
    validationUrl?: string,
  ): Promise<{ blob: Blob; filename: string; validation?: ValidationResult }> {
    const templateUrl = templateUrlOf(evento);
    const template = await loadImage(templateUrl);
    const signature =
      evento.signature.useSignature && evento.signature.signatureDataUrl
        ? await loadImage(evento.signature.signatureDataUrl)
        : null;
    const fonts = await FontManager.instance.load(evento.appearance.fontName);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponível");
    const engine = new CertificateEngine(ctx);
    const input = this.toInput(evento, participante);

    // QR code options (se validação online estiver configurada)
    let qrOptions: QrDrawOptions | undefined;
    let validation: ValidationResult | undefined;
    if (validationUrl && evento.qrCode?.enabled) {
      qrOptions = {
        url: validationUrl,
        size: evento.qrCode.size,
        style: evento.qrCode.style,
        posX: evento.qrCode.posX,
        posY: evento.qrCode.posY,
        showLabel: evento.qrCode.showLabel,
        fgColor: evento.qrCode.fgColor,
        bgColor: evento.qrCode.bgColor,
      };
    }

    await engine.render(input, template, fonts, signature, qrOptions);

    const exporter = new PdfExporter();
    const blob = exporter.toBlob(canvas, "certificado.pdf");
    const filename = this.buildFilename(participante);
    return { blob, filename, validation };
  }

  /** Constrói o CertificateInput a partir do evento + participante. */
  static toInput(evento: Evento, participante: Participante): CertificateInput {
    const funcao = participante.funcao === "Outro" ? participante.funcaoCustom : participante.funcao;
    const cargaHoraria = participante.cargaHoraria || evento.cargaHorariaPadrao || "";
    return {
      nome: participante.nome,
      funcaoParticipante: funcao,
      docTipo: participante.docTipo,
      docNumero: participante.docNumero,
      nomeTrabalho: participante.nomeTrabalho,
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
      textWidth: evento.appearance.textWidth ?? 1500,
      fontColor: evento.appearance.fontColor,
      letterSpacing: evento.appearance.letterSpacing,
      lineHeight: evento.appearance.lineHeight,
      useSignature: evento.signature.useSignature,
      signaturePath: evento.signature.signatureDataUrl,
      signaturePosX: evento.signature.signaturePosX,
      signaturePosY: evento.signature.signaturePosY,
      signatureSize: evento.signature.signatureSize,
    };
  }
  private toInput = CertificateGenerator.toInput;

  private buildFilename(p: Participante): string {
    const nomeF = (p.nome || "certificado").toUpperCase().replace(/\s+/g, "_");
    const funcF = (p.funcao === "Outro" ? p.funcaoCustom : p.funcao || "")
      .toUpperCase()
      .replace(/\(A\)/g, "")
      .replace(/\s+/g, "_");
    return `${nomeF}-${funcF}.pdf`;
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
