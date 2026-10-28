// ZipExporter — gera um ZIP com vários PDFs de certificados (em memória).
// Usado pelo botão "Baixar todos (ZIP)" na tela do evento.
import JSZip from "jszip";
import type { Evento, Participante } from "./types";
import { CertificateEngine, type QrDrawOptions } from "../cert/CertificateEngine";
import { FontManager } from "../cert/FontManager";
import { PdfExporter } from "../cert/PdfExporter";
import { TextComposer } from "../cert/TextComposer";
import { ValidationRegistrar } from "./ValidationRegistrar";
import { isValidAccessKey, API_URL } from "./apiConfig";
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
    accessKey?: string,
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

    // Validation registrar (se access key configurada)
    const registrar = isValidAccessKey(accessKey || "")
      ? new ValidationRegistrar(accessKey!)
      : null;

    // Se tem access key: registra apenas os que ainda não têm validationKey
    let batchResults: Array<{ ok: boolean; validationKey: string; validateUrl?: string }> = [];
    if (registrar) {
      // 1. Registra evento (idempotente)
      const eventResult = await registrar.registerEvent(evento);
      const eventId = eventResult.ok ? eventResult.eventId : undefined;

      // 2. Separa participantes: os que já têm key (reutilizam) e os que não têm (registram)
      const toRegister = evento.participantes.filter((p) => p.nome.trim() && !p.validationKey);

      // 3. Batch: registra os novos em UMA requisição
      if (toRegister.length > 0) {
        const batch = await registrar.registerBatch(evento, toRegister, eventId);
        batchResults = batch.results;
      }
    }

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
        // Determina validationUrl: reutiliza key existente ou pega do batch
        let qrOptions: QrDrawOptions | undefined;
        if (evento.qrCode?.enabled) {
          let url: string | undefined;
          if (p.validationKey) {
            // Já tem key salva — reutiliza
            url = `${process.env.BASE_URL || API_URL}/v/${p.validationKey}`;
          } else {
            // Procura no batch results pelo índice correspondente
            const toRegister = evento.participantes.filter((pp) => pp.nome.trim() && !pp.validationKey);
            const batchIdx = toRegister.indexOf(p);
            if (batchIdx >= 0 && batchResults[batchIdx]?.ok) {
              url = batchResults[batchIdx].validateUrl;
            }
          }
          if (url) {
            qrOptions = {
              url,
              size: evento.qrCode.size,
              style: evento.qrCode.style,
              posX: evento.qrCode.posX,
              posY: evento.qrCode.posY,
              showLabel: evento.qrCode.showLabel,
              fgColor: evento.qrCode.fgColor,
              bgColor: evento.qrCode.bgColor,
            };
          }
        }

        const input = this.toCertificateInput(evento, p);
        await engine.render(input, template, fonts, signature, qrOptions);
        const pdfBlob = exporter.toBlob(canvas, filename);
        const bytes = new Uint8Array(await pdfBlob.arrayBuffer());
        zip.file(filename, bytes);
      } catch (err) {
        zip.file(
          `${filename}.erro.txt`,
          `Erro ao gerar: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
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
