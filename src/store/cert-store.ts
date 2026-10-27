// Store Zustand — estado do formulário do certificado + ações.
// Mantém a UI funcional/idiomática, enquanto a lógica pesada vive nas classes OOP.
import { create } from "zustand";
import type { CertificateInput, DocTipo } from "@/lib/cert/types";
import { FUNCOES_HORAS, ATIVIDADES_SEM_NOME } from "@/lib/cert/Catalogs";
import { TextComposer } from "@/lib/cert/TextComposer";

interface CertState {
  // Participante
  nome: string;
  funcao: string;
  funcaoCustom: string;
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
  fontName: string;
  fontSize: number;
  useItalic: boolean;
  posX: number;
  posY: number;
  // Assinatura
  useSignature: boolean;
  signatureName: string;
  signatureUrl: string | null;
  signatureSize: number;
  signaturePosX: number;
  signaturePosY: number;
  // Atualizações
  betaUpdates: boolean;

  // Ações
  set: (partial: Partial<CertState>) => void;
  setFuncao: (funcao: string) => void;
  setTipoAtividade: (tipo: string) => void;
  setSignaturePos: (x: number, y: number) => void;
  loadSignature: (name: string, url: string) => void;
  clearSignature: () => void;

  // Derivados
  getFuncaoParticipante: () => string;
  toCertificateInput: (forPreview?: boolean) => CertificateInput;
}

const composer = new TextComposer();

export const useCertStore = create<CertState>((set, get) => ({
  // Participante
  nome: "",
  funcao: "Ouvinte",
  funcaoCustom: "",
  docTipo: "Nenhum",
  docNumero: "",
  nomeTrabalho: "",
  // Evento
  tipoAtividade: "Evento",
  nomeEvento: "",
  cargaHoraria: FUNCOES_HORAS["Ouvinte"],
  useDate: false,
  dataInicio: "",
  dataFim: "",
  // Aparência
  templateName: "template_padrao.png",
  fontName: "OpenSans",
  fontSize: 50,
  useItalic: true,
  posX: 250,
  posY: 600,
  // Assinatura
  useSignature: false,
  signatureName: "",
  signatureUrl: null,
  signatureSize: 300,
  signaturePosX: 1200,
  signaturePosY: 700,
  // Atualizações
  betaUpdates: false,

  set: (partial) => set(partial),

  setFuncao: (funcao) => {
    const isOutro = funcao === "Outro";
    const isApresentador = funcao === "Apresentador(a)";
    set({
      funcao,
      funcaoCustom: isOutro ? get().funcaoCustom : "",
      cargaHoraria: isOutro ? "" : FUNCOES_HORAS[funcao] ?? "",
      nomeTrabalho: isApresentador ? get().nomeTrabalho : "",
    });
  },

  setTipoAtividade: (tipo) => {
    const semNome = ATIVIDADES_SEM_NOME.includes(tipo);
    set({
      tipoAtividade: tipo,
      nomeEvento: semNome ? "" : get().nomeEvento,
    });
  },

  setSignaturePos: (x, y) => set({ signaturePosX: x, signaturePosY: y }),
  loadSignature: (name, url) => set({ signatureName: name, signatureUrl: url }),
  clearSignature: () =>
    set({ signatureName: "", signatureUrl: null, useSignature: false }),

  getFuncaoParticipante: () => {
    const { funcao, funcaoCustom } = get();
    return funcao === "Outro" ? funcaoCustom : funcao;
  },

  toCertificateInput: (forPreview = false) => {
    const s = get();
    const placeholder = (v: string, ph: string) =>
      v ? v : forPreview ? ph : "";
    return {
      nome: placeholder(s.nome, "[Nome da Pessoa]"),
      funcaoParticipante: s.getFuncaoParticipante() || (forPreview ? "[Função]" : ""),
      docTipo: s.docTipo,
      docNumero: s.docNumero,
      nomeTrabalho: s.nomeTrabalho,
      tipoAtividade: s.tipoAtividade,
      nomeEvento: placeholder(s.nomeEvento, "[Nome do Evento]"),
      cargaHoraria: s.cargaHoraria,
      useDate: s.useDate,
      dataInicio: s.dataInicio,
      dataFim: s.dataFim,
      templateName: s.templateName,
      templateUrl: `/models/${s.templateName}`,
      fontName: s.fontName,
      fontSize: s.fontSize,
      useItalic: s.useItalic,
      posX: s.posX,
      posY: s.posY,
      useSignature: s.useSignature,
      signaturePath: s.signatureUrl,
      signaturePosX: s.signaturePosX,
      signaturePosY: s.signaturePosY,
      signatureSize: s.signatureSize,
    };
  },
}));

// Reexporta o composer para uso eventual em componentes (debug/preview de texto)
export { composer };
