// ColorSuggester — analisa as cores dominantes de um template de imagem
// e sugere cores complementares/harmônicas para a fonte e QR code.
// Usa HSL para cálculos de harmonia cromática.

export interface SuggestedColors {
  dominant: string;       // cor dominante do template
  complementary: string;  // cor complementar (oposta no círculo cromático)
  analogous: string[];    // cores análogas (adjacentes no círculo)
  triadic: string[];      // cores triádicas (120° no círculo)
  fontSuggestions: string[]; // cores sugeridas para fonte (alto contraste)
  qrFgSuggestions: string[]; // cores sugeridas para QR code
}

/**
 * Analisa um template de imagem e sugere cores harmoniosas.
 * Usa amostragem de pixels + conversão para HSL para cálculo de harmonia.
 */
export class ColorSuggester {
  /**
   * Analisa o template e retorna cores sugeridas.
   * @param image  imagem do template carregada
   * @param sampleSize  número de pixels a amostrar (default 1000)
   */
  static analyze(image: HTMLImageElement, sampleSize = 1000): SuggestedColors {
    const canvas = document.createElement("canvas");
    const w = Math.min(image.naturalWidth, 200);
    const h = Math.min(image.naturalHeight, 200);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return this.defaultColors();

    ctx.drawImage(image, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;

    // Amostra pixels e calcula a cor média
    let r = 0, g = 0, b = 0, count = 0;
    const step = Math.max(1, Math.floor((w * h) / sampleSize));
    for (let i = 0; i < data.length; i += 4 * step) {
      // Ignora pixels muito transparentes
      if (data[i + 3] < 128) continue;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
    if (count === 0) return this.defaultColors();

    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    const dominant = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    const hsl = this.rgbToHsl(r, g, b);

    // Complementar: H + 180°
    const compHsl = [(hsl[0] + 180) % 360, hsl[1], hsl[2]];
    const complementary = this.hslToHex(compHsl[0], compHsl[1], compHsl[2]);

    // Análogas: H ± 30°
    const analogous = [
      this.hslToHex((hsl[0] + 30) % 360, hsl[1], hsl[2]),
      this.hslToHex((hsl[0] - 30 + 360) % 360, hsl[1], hsl[2]),
    ];

    // Triádicas: H ± 120°
    const triadic = [
      this.hslToHex((hsl[0] + 120) % 360, hsl[1], hsl[2]),
      this.hslToHex((hsl[0] + 240) % 360, hsl[1], hsl[2]),
    ];

    // Sugestões de fonte: cores com alto contraste contra o dominante
    // Se o dominante é claro (luminância > 0.5), sugere cores escuras; vice-versa
    const luminance = hsl[2];
    const fontSuggestions: string[] = [];
    if (luminance > 0.5) {
      // Template claro → sugere cores escuras
      fontSuggestions.push("#1a1612", "#2c2620", this.hslToHex(hsl[0], Math.min(hsl[1] * 1.5, 1), 0.15));
    } else {
      // Template escuro → sugere cores claras
      fontSuggestions.push("#f5f0e8", "#e8e0d0", this.hslToHex(hsl[0], Math.min(hsl[1] * 1.5, 1), 0.9));
    }

    // Sugestões de QR: usa complementar e triádicas com ajuste de luminância
    const qrFgSuggestions = [
      this.hslToHex(compHsl[0], compHsl[1], luminance > 0.5 ? 0.15 : 0.85),
      this.hslToHex(triadic[0] ? this.hexToHsl(triadic[0])[0] : 0, 0.7, luminance > 0.5 ? 0.15 : 0.85),
      dominant,
    ];

    return {
      dominant,
      complementary,
      analogous,
      triadic,
      fontSuggestions,
      qrFgSuggestions,
    };
  }

  private static defaultColors(): SuggestedColors {
    return {
      dominant: "#faf8f3",
      complementary: "#1a1612",
      analogous: ["#e8e0d0", "#f5f0e8"],
      triadic: ["#a8a098", "#5a5848"],
      fontSuggestions: ["#1a1612", "#2c2620", "#4a4038"],
      qrFgSuggestions: ["#1a1612", "#4a4038", "#645b3e"],
    };
  }

  /** Converte RGB para HSL. */
  private static rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
        case g: h = ((b - r) / d + 2) * 60; break;
        case b: h = ((r - g) / d + 4) * 60; break;
      }
    }
    return [h, s, l];
  }

  /** Converte HSL para hex. */
  private static hslToHex(h: number, s: number, l: number): string {
    const c = this.hslToRgb(h, s, l);
    return `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
  }

  /** Converte HSL para RGB. */
  private static hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h /= 360;
    let r: number, g: number, b: number;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [r * 255, g * 255, b * 255];
  }

  /** Converte hex para HSL. */
  private static hexToHsl(hex: string): [number, number, number] {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return this.rgbToHsl(r, g, b);
  }
}
