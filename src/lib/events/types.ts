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
  validationKey?: string;  // chave de validação VPS (preenchida após primeiro registro)
  createdAt: string;
  updatedAt: string;
}

/**
 * Sistema de coordenadas CENTRADO: todos os eixos de posição (X, Y) têm como
 * origem o CENTRO ABSOLUTO da imagem do template, independente das dimensões.
 *   • posX = 0  →  elemento centralizado horizontalmente no centro da imagem
 *   • posY = 0  →  elemento centralizado verticalmente no centro da imagem
 *   • valores negativos deslocam para esquerda/cima; positivos para direita/baixo
 *
 * Para o bloco de texto:
 *   • posX       → delta do centro X até o CENTRO do bloco de texto
 *   • posY       → delta do centro Y até o TOPO do bloco de texto (1ª linha)
 *   • textWidth  → largura total do bloco, centrado em (centroX + posX)
 *   • Quando posX=posY=textWidth=0  →  texto concentra-se no centro absoluto
 *
 * Para assinatura e QR code:
 *   • posX/posY  → delta do centro da imagem até o CENTRO do elemento
 *
 * O campo `coordSystem` marca eventos já migrados do sistema antigo (absolute).
 */
export type CoordSystem = "absolute" | "center";

/** Configurações de aparência do certificado (pertencem ao evento). */
export interface CertAppearance {
  fontName: string;
  fontSize: number;
  useItalic: boolean;
  posX: number;            // delta do centro X da imagem até o centro do bloco de texto
  posY: number;            // delta do centro Y da imagem até o topo do bloco de texto
  textWidth: number;       // largura total do bloco de texto (centrado em centroX+posX)
  fontColor: string;
  fontWeight: number;
  letterSpacing: number;
  lineHeight: number;
  coordSystem?: CoordSystem;  // "center" (default going forward) | "absolute" (legacy)
}

/** Configurações de assinatura digital (pertencem ao evento). */
export interface CertSignature {
  useSignature: boolean;
  signatureName: string;
  // dataURL para persistir imagem carregada; ou null
  signatureDataUrl: string | null;
  signatureSize: number;
  signaturePosX: number;   // delta do centro X da imagem até o CENTRO da assinatura
  signaturePosY: number;   // delta do centro Y da imagem até o CENTRO da assinatura
}

/** Estilos visuais do QR code. */
export type QrStyle = "classic" | "rounded" | "dots" | "minimal";

/** Configurações do QR code de validação (pertencem ao evento). */
export interface CertQrCode {
  enabled: boolean;
  size: number;
  style: QrStyle;
  posX: number;            // delta do centro X da imagem até o CENTRO do QR
  posY: number;            // delta do centro Y da imagem até o CENTRO do QR
  showLabel: boolean;
  fgColor: string;       // cor dos módulos (padrão: #1a1612)
  bgColor: string;       // cor de fundo (padrão: "transparent")
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
  // Aparência, assinatura e QR code
  appearance: CertAppearance;
  signature: CertSignature;
  qrCode: CertQrCode;
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
