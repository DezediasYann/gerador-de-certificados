// FontManager — gerencia fontes bundled + customizadas (uploads em runtime).
// Fontes customizadas são registradas dinamicamente e persistidas apenas na sessão
// (não no storage — o usuário re-carrega se quiser usar novamente).
import type { FontFamilyDescriptor } from "../cert/types";
import { AVAILABLE_FONTS } from "../cert/Catalogs";
import { FontLoader } from "./FontLoader";

export interface CustomFont {
  id: string;          // id único
  label: string;       // rótulo exibido (nome do arquivo sem extensão)
  regularDataUrl: string;
  italicDataUrl: string | null; // opcional
}

/**
 * Gerenciador singleton de fontes. Mantém a lista de fontes disponíveis
 * (bundled + customizadas) e um FontLoader compartilhado.
 */
export class FontManager {
  private customFonts: CustomFont[] = [];
  private loader = new FontLoader();

  /** Lista todas as fontes disponíveis (bundled + customizadas). */
  listAll(): Array<{ id: string; label: string; isCustom: boolean }> {
    return [
      ...AVAILABLE_FONTS.map((f) => ({ id: f.name, label: f.label, isCustom: false })),
      ...this.customFonts.map((f) => ({ id: f.id, label: f.label, isCustom: true })),
    ];
  }

  /** Adiciona uma fonte customizada a partir de uploads. */
  async addCustom(regularFile: File, italicFile?: File | null): Promise<CustomFont> {
    const regularDataUrl = await fileToDataUrl(regularFile);
    const italicDataUrl = italicFile ? await fileToDataUrl(italicFile) : null;
    const label = regularFile.name.replace(/\.[^.]+$/, "");
    const id = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const custom: CustomFont = { id, label, regularDataUrl, italicDataUrl };
    this.customFonts.push(custom);

    // Registra no FontLoader imediatamente para uso no preview
    await this.loader.loadCustom(custom);

    return custom;
  }

  /** Remove uma fonte customizada. */
  removeCustom(id: string): void {
    this.customFonts = this.customFonts.filter((f) => f.id !== id);
  }

  /** Carrega uma fonte pelo ID (bundled ou customizada). */
  async load(id: string) {
    // Se é bundled
    const bundled = AVAILABLE_FONTS.find((f) => f.name === id);
    if (bundled) return this.loader.load(bundled.name);
    // Se é customizada
    const custom = this.customFonts.find((f) => f.id === id);
    if (custom) return this.loader.loadCustom(custom);
    throw new Error(`Fonte não encontrada: ${id}`);
  }

  static instance = new FontManager();
}

/** Helper: lê arquivo como dataURL. */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Falha ao ler arquivo de fonte"));
    reader.readAsDataURL(file);
  });
}
