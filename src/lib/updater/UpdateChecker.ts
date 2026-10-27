// UpdateChecker — verifica releases no GitHub e compara com a versão atual.
// Porte da lógica de updater.py (Python) para TypeScript, funcional no browser e no Tauri.
import type { UpdateInfo } from "../cert/types";
import { GITHUB_REPO } from "../cert/Catalogs";

interface GithubRelease {
  tag_name: string;
  body: string;
  prerelease: boolean;
  published_at: string;
  assets: { browser_download_url: string; name: string }[];
}

export class UpdateChecker {
  constructor(
    private repo: string = GITHUB_REPO,
    private currentVersion: string,
  ) {}

  /**
   * Verifica se há uma atualização disponível.
   * @param allowPrerelease  se true, considera pré-releases
   * @returns UpdateInfo ou null se já está na última versão / erro de rede
   */
  async check(allowPrerelease = false): Promise<UpdateInfo | null> {
    try {
      let release: GithubRelease | null = null;

      if (allowPrerelease) {
        // Lista todas as releases e pega a pré-release mais recente, ou a latest
        const res = await fetch(`https://api.github.com/repos/${this.repo}/releases`, {
          headers: { Accept: "application/vnd.github+json" },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return null;
        const releases = (await res.json()) as GithubRelease[];
        const pre = releases.find((r) => r.prerelease);
        release = pre ?? releases[0] ?? null;
      } else {
        const res = await fetch(`https://api.github.com/repos/${this.repo}/releases/latest`, {
          headers: { Accept: "application/vnd.github+json" },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return null;
        release = (await res.json()) as GithubRelease;
      }

      if (!release) return null;
      const latest = release.tag_name;
      if (!latest || latest === this.currentVersion) return null;

      const asset =
        release.assets.find((a) => this.isAssetForCurrentPlatform(a.name)) ??
        release.assets[0];

      return {
        version: latest,
        downloadUrl: asset?.browser_download_url ?? "",
        changelog: release.body || "Sem notas de lançamento adicionais.",
        isPrerelease: release.prerelease,
        publishedAt: release.published_at,
      };
    } catch (err) {
      console.warn("Falha ao verificar atualização:", err);
      return null;
    }
  }

  /** Heurística simples para identificar o asset da plataforma atual. */
  private isAssetForCurrentPlatform(name: string): boolean {
    const n = name.toLowerCase();
    if (typeof navigator !== "undefined" && navigator.platform) {
      const p = navigator.platform.toLowerCase();
      if (p.includes("win")) return n.endsWith(".msi") || n.endsWith(".exe");
      if (p.includes("mac")) return n.endsWith(".dmg") || n.includes(".app.tar.gz");
      if (p.includes("linux")) return n.endsWith(".deb") || n.endsWith(".appimage");
    }
    return false;
  }
}
