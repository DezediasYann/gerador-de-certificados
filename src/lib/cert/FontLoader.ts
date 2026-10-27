// FontLoader — carrega famílias de fontes TrueType via FontFace API e as registra no documento.
// Cada família fica disponível para o CertificateEngine usar no canvas.
import type { FontFamilyDescriptor, FontPair } from "./types";
import { AVAILABLE_FONTS } from "./Catalogs";

export class FontLoader {
  private loaded = new Map<string, FontPair>();
  private loading = new Map<string, Promise<FontPair>>();

  /** Lista as famílias disponíveis empacotadas com o app. */
  static availableFamilies(): FontFamilyDescriptor[] {
    return AVAILABLE_FONTS;
  }

  /** Carrega (ou retorna do cache) uma família de fonte pelo nome interno. */
  async load(name: string): Promise<FontPair> {
    if (this.loaded.has(name)) return this.loaded.get(name)!;
    if (this.loading.has(name)) return this.loading.get(name)!;

    const desc = AVAILABLE_FONTS.find((f) => f.name === name);
    if (!desc) throw new Error(`Família de fonte desconhecida: ${name}`);

    const promise = this.loadDescriptor(desc);
    this.loading.set(name, promise);
    try {
      const pair = await promise;
      this.loaded.set(name, pair);
      return pair;
    } finally {
      this.loading.delete(name);
    }
  }

  /** Carrega uma família a partir de um descritor. */
  private async loadDescriptor(desc: FontFamilyDescriptor): Promise<FontPair> {
    const family = `CertFont-${desc.name}`;
    const baseUrl = `/fonts/${desc.name}`;
    const regularFace = new FontFace(family, `url(${baseUrl}/${desc.regularFile})`);
    const italicFace = new FontFace(family, `url(${baseUrl}/${desc.italicFile})`, {
      style: "italic",
    });
    await Promise.all([regularFace.load(), italicFace.load()]);
    document.fonts.add(regularFace);
    document.fonts.add(italicFace);
    return {
      family,
      regularFont: (size: number) => `${size}px "${family}"`,
      italicFont: (size: number) => `italic ${size}px "${family}"`,
    };
  }
}
