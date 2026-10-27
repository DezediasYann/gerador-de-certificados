// Tipos centrais do domínio de certificados.
// Mantidos separados da lógica para que as classes (TextComposer, CertificateEngine, etc.)
// possam importá-los sem dependências circulares.

export type DocTipo = "Nenhum" | "CPF" | "Matrícula";

export type TextStyle = "regular" | "italic";

/** Um pedaço de texto composto com seu estilo (regular ou itálico). */
export interface TextSegment {
  text: string;
  style: TextStyle;
}

/** Texto completo do certificado, como uma sequência de segmentos. */
export interface ComposedText {
  segments: TextSegment[];
}

/** Par de fontes (regular + itálico) de uma família carregada. */
export interface FontPair {
  family: string;          // nome CSS da família, ex.: "CertFont-OpenSans"
  regularFont: (size: number) => string;  // ex.: `50px "CertFont-OpenSans"`
  italicFont: (size: number) => string;   // ex.: `italic 50px "CertFont-OpenSans"`
}

/** Descrição de uma família de fonte disponível no app. */
export interface FontFamilyDescriptor {
  name: string;       // id interno, ex.: "OpenSans"
  label: string;      // rótulo exibido, ex.: "Open Sans"
  regularFile: string; // nome do arquivo .ttf em /public/fonts/{name}/
  italicFile: string;
}

/** Modelo de template disponível. */
export interface TemplateDescriptor {
  name: string;     // nome do arquivo em /public/models/
  label: string;    // rótulo exibido
  url: string;      // URL carregável
}

/** Entrada completa para gerar um certificado. */
export interface CertificateInput {
  // Participante
  nome: string;
  funcaoParticipante: string;
  docTipo: DocTipo;
  docNumero: string;
  nomeTrabalho: string;
  // Evento
  tipoAtividade: string;
  nomeEvento: string;
  cargaHoraria: string;
  useDate: boolean;
  dataInicio: string;
  dataFim: string;
  // Aparência
  templateName: string;
  templateUrl: string;
  fontName: string;
  fontSize: number;
  useItalic: boolean;
  posX: number;
  posY: number;
  // Assinatura
  useSignature: boolean;
  signaturePath: string | null;
  signaturePosX: number;
  signaturePosY: number;
  signatureSize: number;
}

/** Resultado da verificação de atualização. */
export interface UpdateInfo {
  version: string;        // tag, ex.: "v1.1.0"
  downloadUrl: string;    // URL do asset (browser fallback)
  changelog: string;      // corpo da release
  isPrerelease: boolean;
  publishedAt: string;
}

/** Linha processada de uma planilha de lote. */
export interface BatchRow {
  nome: string;
  docTipo: DocTipo;
  docNumero: string;
  funcaoParticipante: string;
  nomeTrabalho: string;
}

/** Resultado da geração de um certificado em lote. */
export interface GeneratedCert {
  filename: string;
  success: boolean;
  error?: string;
}
