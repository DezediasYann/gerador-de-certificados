// FontLoader — carrega famílias de fontes TrueType via FontFace API e as registra no documento.
// Cada família fica disponível para o CertificateEngine usar no canvas.
import type { FontFamilyDescriptor, FontPair } from "./types";
import { AVAILABLE_FONTS } from "./Catalogs";
import type { CustomFont } from "./FontManager";

export class FontLoader {
  private loaded = new Map<string, FontPair>();
  private loading = new Map<string, Promise<FontPair>>();

  /** Lista as famílias disponíveis empacotadas com o app. */
  static availableFamilies(): FontFamilyDescriptor[] {
    return AVAILABLE_FONTS;
  }

  /** Carrega (ou retorna do cache) uma família de fonte bundled pelo nome interno. */
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

  /** Carrega (ou retorna do cache) uma fonte customizada a partir de dataURLs. */
  async loadCustom(custom: CustomFont): Promise<FontPair> {
    if (this.loaded.has(custom.id)) return this.loaded.get(custom.id)!;
    if (this.loading.has(custom.id)) return this.loading.get(custom.id)!;

    const promise = this.loadCustomDescriptor(custom);
    this.loading.set(custom.id, promise);
    try {
      const pair = await promise;
      this.loaded.set(custom.id, pair);
      return pair;
    } finally {
      this.loading.delete(custom.id);
    }
  }

  /** Carrega uma família bundled a partir de um descritor. */
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

  /** Carrega uma família customizada a partir de dataURLs. */
  private async loadCustomDescriptor(custom: CustomFont): Promise<FontPair> {
    const family = `CertFont-${custom.id}`;
    const regularFace = new FontFace(family, `url(${custom.regularDataUrl})`);
    const italicFace = new FontFace(
      family,
      `url(${custom.italicDataUrl ?? custom.regularDataUrl})`,
      { style: "italic" },
    );
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
