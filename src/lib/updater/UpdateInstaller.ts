// UpdateInstaller — instala a atualização.
// No Tauri, usa o plugin-updater (verificação criptográfica + instalação nativa).
// No browser, abre a URL de download da release no GitHub.
import type { UpdateInfo } from "../cert/types";
import { isTauri } from "../tauri/TauriBridge";

export class UpdateInstaller {
  /**
   * Tenta instalar a atualização via Tauri Updater.
   * @returns true se a instalação foi iniciada (Tauri), false se caiu no fallback (browser).
   */
  async install(update: UpdateInfo): Promise<boolean> {
    if (isTauri()) {
      try {
        const { check, Update } = await import("@tauri-apps/plugin-updater");
        const available = await check();
        if (available) {
          await available.downloadAndInstall();
          await relaunch();
          return true;
        }
        // Se o plugin não encontrou, cai no fallback
      } catch (err) {
        console.warn("Tauri updater falhou, usando fallback:", err);
      }
    }
    // Fallback browser: abre a release no GitHub
    if (typeof window !== "undefined" && update.downloadUrl) {
      window.open(update.downloadUrl, "_blank");
    }
    return false;
  }
}

async function relaunch(): Promise<void> {
  try {
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  } catch {
    // plugin-process pode não estar instalado; o usuário reinicia manualmente
  }
}
