// Catálogos embutidos do domínio (funções, tipos de atividade, fontes disponíveis).
// Porte fiel dos catálogos do programa original (app.py).
import type { DocTipo, FontFamilyDescriptor } from "./types";

/**
 * Catálogo estático de funções do participante e suas cargas horárias padrão.
 * "Outro" tem carga horária livre (string vazia).
 */
export const FUNCOES_HORAS: Record<string, string> = {
  "Ouvinte": "5h",
  "Palestrante": "2h",
  "Apresentador(a)": "10h",
  "Organizador(a)": "10h",
  "Mediador(a)": "2h",
  "Debatedor(a)": "2h",
  "Outro": "",
};

/** Tipos de atividade disponíveis (porte fiel do programa original). */
export const TIPOS_DE_ATIVIDADE: string[] = [
  "Evento",
  "Seminário",
  "Palestra",
  "Mesa redonda",
  "Apresentação de trabalho",
  "Curso",
  "Oficina",
  "Projeto de extensão",
  "Evento científico",
  "Disciplina não curricular",
  "Atividade Institucionalizada",
  "Estágio extracurricular",
  "Curso de língua estrangeira",
  "Concurso de monografia",
  "Bolsa de Iniciação Científica",
  "Competição esportiva",
  "Outro",
];

/** Atividades onde o campo "Nome do Evento" é desativado. */
export const ATIVIDADES_SEM_NOME: string[] = [
  "Disciplina não curricular",
  "Bolsa de Iniciação Científica",
];

/** Opções de tipo de documento. */
export const DOC_TIPOS: DocTipo[] = ["Nenhum", "CPF", "Matrícula"];

/** Famílias de fonte empacotadas com o app. */
export const AVAILABLE_FONTS: FontFamilyDescriptor[] = [
  {
    name: "OpenSans",
    label: "Open Sans",
    regularFile: "OpenSans-Regular.ttf",
    italicFile: "OpenSans-Italic.ttf",
  },
  {
    name: "Poppins",
    label: "Poppins",
    regularFile: "Poppins-Regular.ttf",
    italicFile: "Poppins-Italic.ttf",
  },
];

/** Versão atual do app — usada pelo OTA checker. */
export const APP_VERSION = "v1.1.5";

/** Repositório GitHub para OTA (substituir pelo repositório real quando publicado). */
export const GITHUB_REPO = "DezediasYann/gerador-de-certificados";

/** Largura máxima do bloco de texto (em pixels na escala do template). */
export const TEXTO_LARGURA_MAXIMA = 1500;
