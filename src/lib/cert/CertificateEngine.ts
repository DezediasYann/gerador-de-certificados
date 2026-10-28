// CertificateEngine — porta fiel de core.py para Canvas API.
// Desenha o texto composto (justificado/centralizado, com quebra de linha e estilos mistos)
// sobre um template de imagem, e cola a assinatura digital com transparência.
// Também desenha o QR code de validação (4 estilos) com boundary check.
import type { CertificateInput, ComposedText, FontPair } from "./types";
import { TEXTO_LARGURA_MAXIMA } from "./Catalogs";
import { TextComposer } from "./TextComposer";
import type { QrStyle } from "../events/types";
import QRCode from "qrcode";

interface WordInfo {
  text: string;
  style: "regular" | "italic";
  width: number;
}

/** Opções do QR code passadas ao engine. */
export interface QrDrawOptions {
  url: string;
  size: number;
  style: QrStyle;
  posX: number;
  posY: number;
  showLabel: boolean;
  fgColor?: string;
  bgColor?: string;
}

/**
 * Motor de renderização de certificados sobre um Canvas 2D.
 *
 * Uso típico:
 *   const engine = new CertificateEngine(ctx);
 *   await engine.render(input, templateImg, fontPair, signatureImg, qrOptions);
 */
export class CertificateEngine {
  private composer = new TextComposer();

  constructor(private ctx: CanvasRenderingContext2D) {}

  /**
   * Renderiza um certificado completo no canvas associado.
   * @param input  dados do certificado
   * @param template  imagem do template já carregada
   * @param fonts  par de fontes (regular + itálico) carregadas
   * @param signatureImg  imagem da assinatura (opcional; se null, ignora assinatura)
   * @param qrOptions  opções do QR code (opcional; se fornecido, desenha QR)
   */
  async render(
    input: CertificateInput,
    template: HTMLImageElement,
    fonts: FontPair,
    signatureImg: HTMLImageElement | null,
    qrOptions?: QrDrawOptions,
  ): Promise<void> {
    const { ctx } = this;
    const w = template.naturalWidth;
    const h = template.naturalHeight;
    ctx.canvas.width = w;
    ctx.canvas.height = h;

    // Centro absoluto da imagem — origem do sistema de coordenadas centrado
    const cx = w / 2;
    const cy = h / 2;

    // 1. Desenha o template
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(template, 0, 0, w, h);

    // 2. Compõe e desenha o texto
    //    posX/posY são deltas a partir do centro da imagem:
    //    • centro do bloco de texto = (cx + posX, cy + posY)
    //    • topo do bloco (1ª linha) = cy + posY
    //    • largura total = textWidth, centrada em (cx + posX)
    const composed = this.composer.compose(input);
    const textWidth = input.textWidth ?? TEXTO_LARGURA_MAXIMA;
    const textAbsLeftX = cx + input.posX - textWidth / 2;
    const textAbsTopY = cy + input.posY;
    this.drawComposedText(composed, textAbsLeftX, textAbsTopY, textWidth, fonts, input.fontSize, input.fontColor, input.letterSpacing, input.lineHeight);

    // 3. Cola a assinatura (se habilitada) — centralizada em (cx + posX, cy + posY)
    if (input.useSignature && signatureImg) {
      const sigCenterX = cx + input.signaturePosX;
      const sigCenterY = cy + input.signaturePosY;
      this.drawSignatureCentered(signatureImg, sigCenterX, sigCenterY, input.signatureSize, w, h);
    }

    // 4. Desenha o QR code de validação (se fornecido) — centralizado em (cx + posX, cy + posY)
    if (qrOptions) {
      const qrCenterX = cx + qrOptions.posX;
      const qrCenterY = cy + qrOptions.posY;
      await this.drawQrCode(qrOptions, qrCenterX, qrCenterY, w, h);
    }
  }

  // ━━ Assinatura centralizada + boundary check ━━

  /** Desenha a assinatura centrada em (centerX, centerY), garantindo que fique dentro do viewport. */
  private drawSignatureCentered(
    img: HTMLImageElement,
    centerX: number,
    centerY: number,
    targetWidth: number,
    canvasW: number,
    canvasH: number,
  ): void {
    const { ctx } = this;
    const ratio = img.naturalHeight / img.naturalWidth;
    const targetHeight = Math.round(targetWidth * ratio);

    // Boundary check: clampa o CENTRO para que a assinatura não saia do canvas
    const clampedCenterX = Math.max(targetWidth / 2, Math.min(centerX, canvasW - targetWidth / 2));
    const clampedCenterY = Math.max(targetHeight / 2, Math.min(centerY, canvasH - targetHeight / 2));

    const absX = clampedCenterX - targetWidth / 2;
    const absY = clampedCenterY - targetHeight / 2;
    ctx.drawImage(img, absX, absY, targetWidth, targetHeight);
  }

  // ━━ QR Code — 4 estilos + boundary check (centralizado) ━━

  /** Desenha um QR code com o estilo escolhido, centralizado em (centerX, centerY). */
  private async drawQrCode(opts: QrDrawOptions, centerX: number, centerY: number, canvasW: number, canvasH: number): Promise<void> {
    try {
      const { ctx } = this;
      const fg = opts.fgColor || "#1a1612";
      const bg = opts.bgColor || "#ffffff";

      // Tamanho do QR limitado entre 60px e 30% do menor lado do canvas
      const minSize = 60;
      const maxSize = Math.min(canvasW, canvasH) * 0.3;
      const qrSize = Math.max(minSize, Math.min(opts.size, maxSize));

      // Boundary check: clampa o CENTRO para que o QR (com label) não saia do canvas
      const labelHeight = opts.showLabel ? 55 : 0;
      const totalHeight = qrSize + labelHeight + 16;
      const totalWidth = qrSize + 24; // inclui padding de fundo
      const clampedCenterX = Math.max(totalWidth / 2, Math.min(centerX, canvasW - totalWidth / 2));
      const clampedCenterY = Math.max(totalHeight / 2, Math.min(centerY, canvasH - totalHeight / 2));

      // Top-left absoluto a partir do centro clamped
      const clampedX = clampedCenterX - qrSize / 2;
      const clampedY = clampedCenterY - (qrSize + labelHeight) / 2;

      // Gera a matrix do QR code — EC level Q (25%) para melhor scaneabilidade com estilos customizados
      const qr = QRCode.create(opts.url, { errorCorrectionLevel: "Q" });
      const moduleCount = qr.modules.size;
      const moduleData = qr.modules.data;
      const moduleSize = qrSize / moduleCount;

      // Fundo — só desenha se NÃO for transparente
      const bgPadding = 12;
      if (bg !== "transparent") {
        ctx.fillStyle = bg;
        ctx.fillRect(
          clampedX - bgPadding,
          clampedY - bgPadding,
          qrSize + bgPadding * 2,
          qrSize + bgPadding * 2 + labelHeight,
        );
      }

      // Desenha os módulos conforme o estilo
      ctx.fillStyle = fg;
      this.drawQrModules(ctx, moduleData, moduleCount, moduleSize, clampedX, clampedY, opts.style, fg, bg);

      // Texto "Valide em" (se habilitado) — mostra o código de validação, não o URL
      if (opts.showLabel) {
        const labelCenterX = clampedX + qrSize / 2;
        const labelY = clampedY + qrSize + 8;

        // Extrai o código de validação da URL (último segmento)
        const validationKey = opts.url.split("/").pop() || "";

        // "Valide em" — fonte sans-serif
        ctx.font = `${Math.max(14, Math.round(qrSize * 0.12))}px sans-serif`;
        ctx.fillStyle = fg;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText("Valide em", labelCenterX, labelY);

        // Código de validação — fonte monospace
        ctx.font = `bold ${Math.max(12, Math.round(qrSize * 0.1))}px monospace`;
        ctx.fillStyle = fg;
        ctx.fillText(validationKey, labelCenterX, labelY + Math.max(18, Math.round(qrSize * 0.15)));

        ctx.textAlign = "start"; // reset
      }
    } catch (err) {
      console.error("Erro ao desenhar QR code:", err);
    }
  }

  /** Desenha os módulos do QR code conforme o estilo. */
  private drawQrModules(
    ctx: CanvasRenderingContext2D,
    data: Uint8Array,
    count: number,
    moduleSize: number,
    offsetX: number,
    offsetY: number,
    style: QrStyle,
    fg: string = "#1a1612",
    bg: string = "#ffffff",
  ): void {
    // Para todos os estilos exceto "minimal", desenhamos os módulos de dados
    // e os finder patterns juntos como quadrados/círculos simples.
    // Para "minimal", os finder patterns são desenhados separadamente.
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        const idx = row * count + col;
        if (!data[idx]) continue;
        const x = offsetX + col * moduleSize;
        const y = offsetY + row * moduleSize;

        // Para estilo "minimal", pula os módulos dos finder patterns (desenhados separadamente)
        if (style === "minimal" && this.isFinderPattern(row, col, count)) continue;

        switch (style) {
          case "classic":
            ctx.fillRect(x, y, moduleSize, moduleSize);
            break;
          case "rounded":
            this.drawRoundedModule(ctx, x, y, moduleSize, moduleSize * 0.25);
            break;
          case "dots":
            ctx.beginPath();
            ctx.arc(x + moduleSize / 2, y + moduleSize / 2, moduleSize * 0.42, 0, Math.PI * 2);
            ctx.fill();
            break;
          case "minimal":
            // Módulos de dados como quadrados pequenos (90% do tamanho, centralizados)
            const scale = 0.9;
            const off = (1 - scale) * 0.5 * moduleSize;
            ctx.fillRect(x + off, y + off, moduleSize * scale, moduleSize * scale);
            break;
        }
      }
    }

    // Para estilo "minimal", desenha os finder patterns como anéis arredondados
    if (style === "minimal") {
      this.drawFinderPatterns(ctx, count, moduleSize, offsetX, offsetY, fg, bg);
    }
  }

  /** Desenha um módulo com cantos arredondados. */
  private drawRoundedModule(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, size: number, radius: number,
  ): void {
    const r = Math.min(radius, size / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + size, y, x + size, y + size, r);
    ctx.arcTo(x + size, y + size, x, y + size, r);
    ctx.arcTo(x, y + size, x, y, r);
    ctx.arcTo(x, y, x + size, y, r);
    ctx.closePath();
    ctx.fill();
  }

  /** Verifica se a posição (row, col) é parte de um finder pattern (3 cantos). */
  private isFinderPattern(row: number, col: number, count: number): boolean {
    // Top-left: 0-6
    if (row < 7 && col < 7) return true;
    // Top-right: 0-6, count-7 to count-1
    if (row < 7 && col >= count - 7) return true;
    // Bottom-left: count-7 to count-1, 0-6
    if (row >= count - 7 && col < 7) return true;
    return false;
  }

  /** Desenha os finder patterns (3 cantos) como anéis arredondados + centro.
   *  Usa evenodd fill para criar o "buraco" do anel de forma limpa. */
  private drawFinderPatterns(
    ctx: CanvasRenderingContext2D,
    count: number,
    moduleSize: number,
    offsetX: number,
    offsetY: number,
    fg: string,
    bg: string,
  ): void {
    const positions = [
      { startRow: 0, startCol: 0 },
      { startRow: 0, startCol: count - 7 },
      { startRow: count - 7, startCol: 0 },
    ];

    const outer = 7 * moduleSize;
    const inner = 5 * moduleSize;
    const center = 3 * moduleSize;
    const radius = 2.5 * moduleSize;

    ctx.fillStyle = fg;

    for (const pos of positions) {
      const x = offsetX + pos.startCol * moduleSize;
      const y = offsetY + pos.startRow * moduleSize;

      // Anel externo: outer rounded-rect com inner rounded-rect (buraco) via evenodd
      ctx.beginPath();
      // Outer
      this.roundRectPath(ctx, x, y, outer, outer, radius);
      // Inner (buraco)
      this.roundRectPath(ctx, x + moduleSize, y + moduleSize, inner, inner, radius - moduleSize);
      ctx.fill("evenodd");

      // Centro 3×3 como círculo
      ctx.beginPath();
      ctx.arc(x + outer / 2, y + outer / 2, center / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Define um path de retângulo arredondado (sem fill/stroke). */
  private roundRectPath(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  /** Desenha um retângulo com cantos arredondados. */
  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Desenha texto composto com quebra de linha e centralização.
   * Porte de draw_mixed_style_text do core.py original.
   */
  private drawComposedText(
    composed: ComposedText,
    posX: number,
    posY: number,
    maxWidth: number,
    fonts: FontPair,
    fontSize: number,
    fontColor?: string,
    letterSpacing?: number,
    lineHeightMul?: number,
  ): void {
    const { ctx } = this;
    const color = fontColor || "#000000";
    const tracking = letterSpacing || 0;
    const lhMul = lineHeightMul || 1.5;

    ctx.font = fonts.regularFont(fontSize);
    const spaceWidth = ctx.measureText(" ").width + tracking;

    const words: WordInfo[] = [];
    for (const seg of composed.segments) {
      if (!seg.text) continue;
      const font = seg.style === "italic" ? fonts.italicFont(fontSize) : fonts.regularFont(fontSize);
      ctx.font = font;
      for (const word of seg.text.split(/\s+/)) {
        if (!word) continue;
        words.push({ text: word, style: seg.style, width: ctx.measureText(word).width + tracking });
      }
    }

    const lines: WordInfo[][] = [];
    let currentLine: WordInfo[] = [];
    let currentWidth = 0;
    for (const word of words) {
      const addedWidth = currentLine.length === 0 ? 0 : spaceWidth;
      if (currentLine.length === 0 || currentWidth + addedWidth + word.width <= maxWidth) {
        currentLine.push(word);
        currentWidth += addedWidth + word.width;
      } else {
        lines.push(currentLine);
        currentLine = [word];
        currentWidth = word.width;
      }
    }
    if (currentLine.length > 0) lines.push(currentLine);

    ctx.font = fonts.regularFont(fontSize);
    const metrics = ctx.measureText("A");
    const lineGap = (metrics.actualBoundingBoxAscent || fontSize * 0.8) * lhMul;

    let y = posY;
    for (const line of lines) {
      const lineTextWidth =
        line.reduce((sum, w) => sum + w.width, 0) + (line.length - 1) * spaceWidth;
      let x = posX + (maxWidth - lineTextWidth) / 2;
      for (const word of line) {
        ctx.font = word.style === "italic" ? fonts.italicFont(fontSize) : fonts.regularFont(fontSize);
        ctx.fillStyle = color;
        ctx.textBaseline = "alphabetic";
        ctx.fillText(word.text, x, y);
        x += word.width + spaceWidth;
      }
      y += lineGap;
    }
  }
}

/** Carrega uma imagem a partir de um data URL (usado para o QR code). */
export function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem do data URL"));
    img.src = dataUrl;
  });
}
