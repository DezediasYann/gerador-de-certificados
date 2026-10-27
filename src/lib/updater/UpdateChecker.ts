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
      // Só há atualização se latest for ESTRITAMENTE MAIOR que a versão atual.
      // Comparação semântica (não string) — evita sugerir downgrade.
      if (!latest || compareVersions(latest, this.currentVersion) <= 0) return null;

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

/**
 * Compara duas versões semânticas (formato "vX.Y.Z" ou "X.Y.Z").
 * @returns 1 se a > b, -1 se a < b, 0 se iguais.
 *          Sufixos pré-release (-beta, -rc) são tratados: -beta.1 < -beta.2 < release.
 */
export function compareVersions(a: string, b: string): number {
  const parseVersion = (v: string) => {
    const clean = v.replace(/^v/, "");
    const [main, pre] = clean.split("-");
    const nums = main.split(".").map((n) => parseInt(n, 10) || 0);
    // Completa com zeros se faltar componentes (ex.: "1.2" → [1,2,0])
    while (nums.length < 3) nums.push(0);
    const preParts = pre
      ? pre.split(".").map((p) => (isNaN(Number(p)) ? p : Number(p)))
      : null;
    return { nums, preParts };
  };

  const va = parseVersion(a);
  const vb = parseVersion(b);

  // Compara componente a componente (major.minor.patch)
  for (let i = 0; i < 3; i++) {
    if (va.nums[i] > vb.nums[i]) return 1;
    if (va.nums[i] < vb.nums[i]) return -1;
  }

  // Versão estável (sem pre-release) é MAIOR que versão com pre-release
  // ex.: 1.2.0 > 1.2.0-beta.1
  if (va.preParts && !vb.preParts) return -1;
  if (!va.preParts && vb.preParts) return 1;
  if (!va.preParts && !vb.preParts) return 0;

  // Ambos têm pre-release — compara componente a componente
  const maxLen = Math.max(va.preParts!.length, vb.preParts!.length);
  for (let i = 0; i < maxLen; i++) {
    const pa = va.preParts![i];
    const pb = vb.preParts![i];
    if (pa === undefined && pb !== undefined) return -1;
    if (pa !== undefined && pb === undefined) return 1;
    if (typeof pa === "number" && typeof pb === "number") {
      if (pa > pb) return 1;
      if (pa < pb) return -1;
    } else if (typeof pa === "string" && typeof pb === "string") {
      if (pa > pb) return 1;
      if (pa < pb) return -1;
    } else {
      // número > string (ex.: beta < 1)
      if (typeof pa === "number") return 1;
      if (typeof pb === "number") return -1;
    }
  }
  return 0;
}
