// ValidationRegistrar — registra certificados na VPS para validação pública.
// Após gerar o PDF localmente, o app chama este registrador que envia apenas
// os dados mínimos de validação para a API. A VPS não recebe o PDF, CPF,
// template, assinatura ou qualquer dado sensível.
//
// O issuer NÃO é enviado pelo app — a VPS extrai o issuer da access key.
// Isso garante que o servidor controla quem emite, não o app.
import { API_URL, isValidAccessKey } from "./apiConfig";
import type { Evento, Participante } from "./types";

export interface ValidationResult {
  ok: boolean;
  validationKey: string;
  validateUrl?: string;
  issuer?: string;
  alreadyRegistered?: boolean;
  error?: string;
}

export interface EventRegistrationResult {
  ok: boolean;
  eventId?: string;
  alreadyExists?: boolean;
  error?: string;
}

export interface BatchResult {
  ok: boolean;
  results: Array<{
    ok: boolean;
    validationKey: string;
    validateUrl?: string;
    error?: string;
  }>;
  success: number;
  failed: number;
}

/**
 * Responsável por registrar certificados na VPS para validação pública.
 * Gera a validation key localmente e envia os dados mínimos.
 */
export class ValidationRegistrar {
  constructor(private accessKey: string) {}

  /** Atualiza a access key. */
  updateKey(key: string): void {
    this.accessKey = key;
  }

  /** Verifica se a access key está configurada. */
  isConfigured(): boolean {
    return isValidAccessKey(this.accessKey);
  }

  /**
   * Registra um certificado na VPS.
   * @param evento  evento do qual o certificado faz parte
   * @param participante  participante alvo
   * @returns resultado com validationKey e validateUrl
   */
  async register(
    evento: Evento,
    participante: Participante,
  ): Promise<ValidationResult> {
    if (!this.isConfigured()) {
      return { ok: false, validationKey: "", error: "Access key não configurada" };
    }

    const validationKey = this.generateKey();
    const issuedAt = new Date().toISOString();
    const funcao = participante.funcao === "Outro" ? participante.funcaoCustom : participante.funcao;
    const cargaHoraria = participante.cargaHoraria || evento.cargaHorariaPadrao || "";

    try {
      const response = await fetch(`${API_URL}/api/certificates/register`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.accessKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          validationKey,
          nome: participante.nome,
          evento: evento.nomeEvento || evento.nome,
          funcao,
          cargaHoraria,
          tipoAtividade: evento.tipoAtividade,
          // issuer NÃO é enviado — a VPS extrai da access key
          issuedAt,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errJson = JSON.parse(text);
          errorMsg = errJson.error || errorMsg;
        } catch {
          if (text) errorMsg += `: ${text.slice(0, 100)}`;
        }
        return { ok: false, validationKey, error: errorMsg };
      }

      const data = await response.json() as {
        ok: boolean;
        id?: string;
        validationKey: string;
        validateUrl?: string;
        alreadyRegistered?: boolean;
      };

      return {
        ok: true,
        validationKey: data.validationKey || validationKey,
        validateUrl: data.validateUrl || `${API_URL}/v/${data.validationKey || validationKey}`,
        alreadyRegistered: data.alreadyRegistered,
      };
    } catch (err) {
      return {
        ok: false,
        validationKey,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Registra um evento na VPS (sem template, só metadados).
   * Retorna o eventId que deve ser passado nos register() subsequentes.
   */
  async registerEvent(evento: Evento): Promise<EventRegistrationResult> {
    if (!this.isConfigured()) {
      return { ok: false, error: "Access key não configurada" };
    }
    try {
      const response = await fetch(`${API_URL}/api/events/register`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.accessKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appEventId: evento.id,
          nome: evento.nome,
          nomeEvento: evento.nomeEvento || evento.nome,
          tipoAtividade: evento.tipoAtividade,
          cargaHorariaPadrao: evento.cargaHorariaPadrao,
          useDate: evento.useDate,
          dataInicio: evento.dataInicio,
          dataFim: evento.dataFim,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        return { ok: false, error: `HTTP ${response.status}: ${text.slice(0, 100)}` };
      }

      const data = await response.json() as { ok: boolean; eventId: string; alreadyExists?: boolean };
      return { ok: true, eventId: data.eventId, alreadyExists: data.alreadyExists };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Registra um certificado vinculado a um evento (com eventId).
   */
  async registerWithEvent(evento: Evento, participante: Participante, eventId: string): Promise<ValidationResult> {
    if (!this.isConfigured()) {
      return { ok: false, validationKey: "", error: "Access key não configurada" };
    }

    const validationKey = this.generateKey();
    const issuedAt = new Date().toISOString();
    const funcao = participante.funcao === "Outro" ? participante.funcaoCustom : participante.funcao;
    const cargaHoraria = participante.cargaHoraria || evento.cargaHorariaPadrao || "";

    try {
      const response = await fetch(`${API_URL}/api/certificates/register`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.accessKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          validationKey,
          nome: participante.nome,
          evento: evento.nomeEvento || evento.nome,
          funcao,
          cargaHoraria,
          tipoAtividade: evento.tipoAtividade,
          eventId,
          issuedAt,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        return { ok: false, validationKey, error: `HTTP ${response.status}: ${text.slice(0, 100)}` };
      }

      const data = await response.json() as { ok: boolean; validationKey: string; validateUrl?: string };
      return {
        ok: true,
        validationKey: data.validationKey || validationKey,
        validateUrl: data.validateUrl || `${API_URL}/v/${data.validationKey || validationKey}`,
      };
    } catch (err) {
      return { ok: false, validationKey, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Registra lote de certificados em UMA requisição.
   * Retorna array de resultados com validationKey + validateUrl para cada.
   */
  async registerBatch(evento: Evento, participantes: Participante[], eventId?: string): Promise<BatchResult> {
    if (!this.isConfigured()) {
      return { ok: false, results: [], success: 0, failed: 0 };
    }

    const certificates = participantes
      .filter((p) => p.nome.trim())
      .map((p) => {
        const funcao = p.funcao === "Outro" ? p.funcaoCustom : p.funcao;
        const cargaHoraria = p.cargaHoraria || evento.cargaHorariaPadrao || "";
        return {
          validationKey: this.generateKey(),
          nome: p.nome,
          evento: evento.nomeEvento || evento.nome,
          funcao,
          cargaHoraria,
          tipoAtividade: evento.tipoAtividade,
          issuedAt: new Date().toISOString(),
        };
      });

    if (certificates.length === 0) {
      return { ok: true, results: [], success: 0, failed: 0 };
    }

    try {
      const response = await fetch(`${API_URL}/api/certificates/register/batch`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.accessKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ certificates, eventId }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        return { ok: false, results: [], success: 0, failed: certificates.length };
      }

      const data = await response.json() as {
        results: Array<{ ok: boolean; validationKey: string; validateUrl?: string; error?: string }>;
        success: number;
        failed: number;
      };

      return {
        ok: true,
        results: data.results,
        success: data.success,
        failed: data.failed,
      };
    } catch (err) {
      return {
        ok: false,
        results: certificates.map((c) => ({
          ok: false,
          validationKey: c.validationKey,
          error: err instanceof Error ? err.message : String(err),
        })),
        success: 0,
        failed: certificates.length,
      };
    }
  }

  /**
   * Consulta info da access key (issuer, status).
   */
  async getKeyInfo(): Promise<{ ok: boolean; issuer?: string; status?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { ok: false, error: "Access key não configurada" };
    }
    try {
      const response = await fetch(`${API_URL}/api/certificates/key-info`, {
        headers: { "Authorization": `Bearer ${this.accessKey}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        return { ok: false, error: `HTTP ${response.status}` };
      }
      const data = await response.json() as { ok: boolean; issuer: string; status: string };
      return { ok: true, issuer: data.issuer, status: data.status };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Revoga um certificado na VPS (direito ao esquecimento — LGPD).
   */
  async revoke(validationKey: string): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const response = await fetch(
        `${API_URL}/api/certificates/register/${validationKey}`,
        {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${this.accessKey}` },
          signal: AbortSignal.timeout(10000),
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  /** Gera uma validation key de 12 chars (base36). */
  private generateKey(): string {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(36).padStart(2, "0"))
      .join("")
      .slice(0, 12);
  }
}
