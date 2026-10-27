// CertificateEngine — porta fiel de core.py para Canvas API.
// Desenha o texto composto (justificado/centralizado, com quebra de linha e estilos mistos)
// sobre um template de imagem, e cola a assinatura digital com transparência.
import type { CertificateInput, ComposedText, FontPair, TextSegment } from "./types";
import { TEXTO_LARGURA_MAXIMA } from "./Catalogs";
import { TextComposer } from "./TextComposer";

interface WordInfo {
  text: string;
  style: "regular" | "italic";
  width: number;
}

/**
 * Motor de renderização de certificados sobre um Canvas 2D.
 *
 * Uso típico:
 *   const engine = new CertificateEngine(ctx);
 *   await engine.render(input, templateImg, fontPair);
 *
 * O motor é stateless entre renderizações — apenas guarda a referência ao contexto.
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
   */
  async render(
    input: CertificateInput,
    template: HTMLImageElement,
    fonts: FontPair,
    signatureImg: HTMLImageElement | null,
  ): Promise<void> {
    const { ctx } = this;
    const w = template.naturalWidth;
    const h = template.naturalHeight;
    ctx.canvas.width = w;
    ctx.canvas.height = h;

    // 1. Desenha o template
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(template, 0, 0, w, h);

    // 2. Compõe e desenha o texto
    const composed = this.composer.compose(input);
    this.drawComposedText(composed, input.posX, input.posY, TEXTO_LARGURA_MAXIMA, fonts, input.fontSize);

    // 3. Cola a assinatura (se habilitada)
    if (input.useSignature && signatureImg) {
      this.drawSignature(signatureImg, input.signaturePosX, input.signaturePosY, input.signatureSize);
    }
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
  ): void {
    const { ctx } = this;

    // Mede a largura do espaço com a fonte regular
    ctx.font = fonts.regularFont(fontSize);
    const spaceWidth = ctx.measureText(" ").width;

    // Tokeniza os segmentos em palavras com estilo
    const words: WordInfo[] = [];
    for (const seg of composed.segments) {
      if (!seg.text) continue;
      const font = seg.style === "italic" ? fonts.italicFont(fontSize) : fonts.regularFont(fontSize);
      ctx.font = font;
      for (const word of seg.text.split(/\s+/)) {
        if (!word) continue;
        words.push({ text: word, style: seg.style, width: ctx.measureText(word).width });
      }
    }

    // Quebra em linhas (word-wrap)
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

    // Altura de linha: 1.5× a altura da fonte regular (aproximada via measureText)
    ctx.font = fonts.regularFont(fontSize);
    const metrics = ctx.measureText("A");
    const lineGap = (metrics.actualBoundingBoxAscent || fontSize * 0.8) * 1.5;

    // Desenha cada linha centralizada
    let y = posY;
    for (const line of lines) {
      const lineTextWidth =
        line.reduce((sum, w) => sum + w.width, 0) + (line.length - 1) * spaceWidth;
      let x = posX + (maxWidth - lineTextWidth) / 2;
      for (const word of line) {
        ctx.font = word.style === "italic" ? fonts.italicFont(fontSize) : fonts.regularFont(fontSize);
        ctx.fillStyle = "black";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(word.text, x, y);
        x += word.width + spaceWidth;
      }
      y += lineGap;
    }
  }

  /** Cola a assinatura preservando proporção e respeitando o canal alpha. */
  private drawSignature(
    img: HTMLImageElement,
    posX: number,
    posY: number,
    targetWidth: number,
  ): void {
    const { ctx } = this;
    const ratio = img.naturalHeight / img.naturalWidth;
    const targetHeight = Math.round(targetWidth * ratio);
    ctx.drawImage(img, posX, posY, targetWidth, targetHeight);
  }
}
