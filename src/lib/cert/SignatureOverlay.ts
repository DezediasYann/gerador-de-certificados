// SignatureOverlay — calcula a conversão de coordenadas entre o canvas de preview (exibido)
// e o canvas original do template (resolução plena). Usado para arrastar a assinatura
// sobre o preview e gravar as coordenadas reais no template.
export class SignatureOverlay {
  /**
   * @param displayWidth  largura em pixels do canvas de preview conforme exibido
   * @param displayHeight altura em pixels do canvas de preview conforme exibido
   * @param originalWidth  largura original do template
   * @param originalHeight altura original do template
   */
  constructor(
    private displayWidth: number,
    private displayHeight: number,
    private originalWidth: number,
    private originalHeight: number,
  ) {}

  /**
   * Converte coordenadas de display (mouse) para coordenadas originais do template.
   * Considera que o template é desenhado com "object-fit: contain" (centralizado).
   */
  toOriginal(displayX: number, displayY: number): { x: number; y: number } | null {
    const rect = this.containRect();
    if (
      displayX < rect.x ||
      displayX > rect.x + rect.width ||
      displayY < rect.y ||
      displayY > rect.y + rect.height
    ) {
      return null; // fora da área do template
    }
    const relX = displayX - rect.x;
    const relY = displayY - rect.y;
    const scaleX = this.originalWidth / rect.width;
    const scaleY = this.originalHeight / rect.height;
    return {
      x: Math.round(relX * scaleX),
      y: Math.round(relY * scaleY),
    };
  }

  /** Converte coordenadas + largura originais para o retângulo de display. */
  toDisplayRect(
    origX: number,
    origY: number,
    origWidth: number,
    origHeight: number,
  ): { x: number; y: number; width: number; height: number } {
    const rect = this.containRect();
    const scaleX = rect.width / this.originalWidth;
    const scaleY = rect.height / this.originalHeight;
    return {
      x: rect.x + origX * scaleX,
      y: rect.y + origY * scaleY,
      width: origWidth * scaleX,
      height: origHeight * scaleY,
    };
  }

  /** Calcula o retângulo onde o template é desenhado (contain, centralizado). */
  private containRect(): { x: number; y: number; width: number; height: number } {
    const scale = Math.min(
      this.displayWidth / this.originalWidth,
      this.displayHeight / this.originalHeight,
    );
    const w = this.originalWidth * scale;
    const h = this.originalHeight * scale;
    return {
      x: (this.displayWidth - w) / 2,
      y: (this.displayHeight - h) / 2,
      width: w,
      height: h,
    };
  }
}
