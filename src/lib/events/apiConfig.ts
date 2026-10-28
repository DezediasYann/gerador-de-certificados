// Configuração da API de validação e backup.
// A URL base é resolvida nesta ordem:
//   1. NEXT_PUBLIC_API_URL (env var) — se definida, tem prioridade máxima
//   2. Em dev no sandbox (VITE/Next dev com VPS API local em 3001) → http://localhost:3001
//      Detectado via NEXT_PUBLIC_SANDBOX=1 (setado só no sandbox)
//   3. Padrão → VPS remota em produção
// O usuário só precisa inserir a access key (recebida do admin do painel)
// e fazer login com email+senha para backup E2E.

/** URL da API — resolvida por env var > sandbox > produção. */
export const API_URL: string = (() => {
  // 1. Override explícito via env var (Next.js expõe NEXT_PUBLIC_*)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // 2. Sandbox de desenvolvimento (VPS API roda localmente em :3001)
  if (process.env.NEXT_PUBLIC_SANDBOX === "1") {
    return "http://localhost:3001";
  }
  // 3. Padrão: VPS remota
  return "https://dezedias.me";
})();

/** Verifica se uma access key tem formato válido. */
export function isValidAccessKey(key: string): boolean {
  return Boolean(key && key.startsWith("gdc_") && key.length > 10);
}
