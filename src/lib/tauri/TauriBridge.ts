// TauriBridge — detecta o ambiente Tauri e expõe adaptadores para dialog/fs/updater/store.
// No navegador (desenvolvimento), faz fallback para APIs web (download, localStorage).
// No Tauri (produção), usa os plugins nativos via import dinâmico.

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Salva um Blob em disco. No Tauri, abre diálogo nativo; no browser, dispara download. */
export async function saveBlob(blob: Blob, defaultName: string, filters?: { name: string; extensions: string[] }[]): Promise<string | null> {
  if (isTauri()) {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");
      const path = await save({
        defaultPath: defaultName,
        filters: filters ?? [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (!path) return null;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      await writeFile(path, bytes);
      return path;
    } catch (err) {
      console.warn("Tauri save falhou, usando fallback browser:", err);
    }
  }
  // Fallback browser
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = defaultName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return defaultName;
}

/** Abre um arquivo. No Tauri, diálogo nativo; no browser, input file. */
export async function openFile(filters?: { name: string; extensions: string[] }[]): Promise<{ name: string; data: Uint8Array } | null> {
  if (isTauri()) {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { readFile } = await import("@tauri-apps/plugin-fs");
      const path = await open({
        multiple: false,
        filters,
      });
      if (!path || typeof path !== "string") return null;
      const data = await readFile(path);
      const name = path.split(/[/\\]/).pop() ?? "arquivo";
      return { name, data };
    } catch (err) {
      console.warn("Tauri open falhou:", err);
      return null;
    }
  }
  // Fallback browser: input file
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    if (filters?.[0]?.extensions) input.accept = filters[0].extensions.map((e) => `.${e}`).join(",");
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      const data = new Uint8Array(await f.arrayBuffer());
      resolve({ name: f.name, data });
    };
    input.click();
  });
}

/** Abre uma imagem de assinatura e devolve uma URL object para uso no <img>. */
export async function openImage(filters = [{ name: "Imagem", extensions: ["png", "jpg", "jpeg"] }]): Promise<{ name: string; url: string } | null> {
  if (isTauri()) {
    const result = await openFile(filters);
    if (!result) return null;
    const blob = new Blob([result.data]);
    return { name: result.name, url: URL.createObjectURL(blob) };
  }
  // Fallback browser
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".png,.jpg,.jpeg";
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      resolve({ name: f.name, url: URL.createObjectURL(f) });
    };
    input.click();
  });
}

/** Abre uma pasta de saída (apenas Tauri). No browser, retorna null. */
export async function openDirectory(): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const result = await open({ directory: true, multiple: false });
    return typeof result === "string" ? result : null;
  } catch {
    return null;
  }
}

/** Escreve um arquivo em um caminho absoluto (apenas Tauri). No browser, faz download. */
export async function writeFileToPath(path: string, bytes: Uint8Array): Promise<void> {
  if (isTauri()) {
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    await writeFile(path, bytes);
    return;
  }
  // browser fallback: download com nome do basename
  const name = path.split(/[/\\]/).pop() ?? path;
  const blob = new Blob([bytes]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
