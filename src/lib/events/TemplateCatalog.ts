// TemplateCatalog — lista templates bundled (vazio por padrão) + helpers de upload.
// O usuário faz upload do seu próprio template no wizard; nenhum template bundled é fornecido.
import type { TemplateDescriptor } from "../cert/types";

export class TemplateCatalog {
  /** Templates bundled disponíveis (nenhum por padrão). */
  static list(): TemplateDescriptor[] {
    return [];
  }

  /** Lê um arquivo de imagem (upload do usuário) e devolve um dataURL persistível. */
  static async fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Falha ao ler arquivo de imagem"));
      reader.readAsDataURL(file);
    });
  }
}
