// Modelos de domínio do paradigma orientado a EVENTOS.
// Um Evento agrupa participantes e configurações de certificado;
// cada Participante gera um certificado individual a partir dessas configurações.

import type { DocTipo } from "../cert/types";

/** Um participante dentro de um evento. */
export interface Participante {
  id: string;
  nome: string;
  docTipo: DocTipo;
  docNumero: string;
  funcao: string;          // chave do catálogo FUNCOES_HORAS ou "Outro"
  funcaoCustom: string;    // preenchido quando funcao === "Outro"
  nomeTrabalho: string;    // preenchido quando Apresentador(a)
  cargaHoraria: string;    // herda do evento se vazio
  createdAt: string;
  updatedAt: string;
}

/** Configurações de aparência do certificado (pertencem ao evento). */
export interface CertAppearance {
  fontName: string;
  fontSize: number;
  useItalic: boolean;
  posX: number;
  posY: number;
}

/** Configurações de assinatura digital (pertencem ao evento). */
export interface CertSignature {
  useSignature: boolean;
  signatureName: string;
  // dataURL para persistir imagem carregada; ou null
  signatureDataUrl: string | null;
  signatureSize: number;
  signaturePosX: number;
  signaturePosY: number;
}

/** Um evento completo. */
export interface Evento {
  id: string;
  nome: string;
  tipoAtividade: string;
  // Template: nome do bundled (templateUrl relativo) OU dataURL de upload custom
  templateName: string;
  templateSource: "bundled" | "upload";
  templateDataUrl: string | null; // só quando upload
  // Campos comuns do certificado
  nomeEvento: string;       // pode diferir de `nome` (ex.: nome curto vs. nome no certificado)
  cargaHorariaPadrao: string;
  useDate: boolean;
  dataInicio: string;
  dataFim: string;
  // Aparência e assinatura
  appearance: CertAppearance;
  signature: CertSignature;
  // Participantes
  participantes: Participante[];
  // Metadados
  createdAt: string;
  updatedAt: string;
}

/** Draft usado no wizard de criação (antes de persistir). */
export type EventDraft = Omit<Evento, "id" | "participantes" | "createdAt" | "updatedAt">;

/** Gera um ID curto baseado em timestamp + random. */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Helper: URL carregável do template de um evento. */
export function templateUrlOf(ev: Evento | EventDraft): string {
  if (ev.templateSource === "upload" && ev.templateDataUrl) return ev.templateDataUrl;
  return `/models/${ev.templateName}`;
}
