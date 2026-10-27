// TextComposer — porta fiel da lógica de composição de texto de core.py (Python).
// Monta o texto do certificado conforme função, tipo de atividade, documento, data e trabalho,
// produzindo uma lista de segmentos com estilo (regular/itálico).
import type { CertificateInput, ComposedText, TextSegment, DocTipo } from "./types";
import { ATIVIDADES_SEM_NOME } from "./Catalogs";

export class TextComposer {
  /**
   * Compõe o texto completo do certificado a partir da entrada.
   * Replica os três ramos do programa original:
   *  1. Apresentador(a) com trabalho
   *  2. Organizador(a) (atividade ≠ Evento)
   *  3. Demais funções
   */
  compose(input: CertificateInput): ComposedText {
    const nome = (input.nome || "[Nome da Pessoa]").toUpperCase();
    const funcaoLower = (input.funcaoParticipante || "[Função]").toLowerCase();
    const tipoAtividade = input.tipoAtividade || "[Tipo de Atividade]";
    const cargaHoraria = this.normalizeCargaHoraria(input.cargaHoraria);
    const nomeTrabalho = input.nomeTrabalho || "[Nome do Trabalho]";
    const nomeEvento = input.nomeEvento || "";

    const textoDocumento = this.buildDocText(input.docTipo, input.docNumero);
    const textoData = this.buildDateText(input.useDate, input.dataInicio, input.dataFim);
    const tipoLower = tipoAtividade.toLowerCase();
    const trechoAtividade = tipoAtividade === "Evento"
      ? "no evento"
      : `da atividade de ${tipoLower}`;

    const segments: TextSegment[] = [];

    const isApresentador = funcaoLower === "apresentador(a)";
    const isOrganizador = funcaoLower === "organizador(a)";
    const hasTrabalho = nomeTrabalho && nomeTrabalho !== "[Nome do Trabalho]";

    if (isApresentador && hasTrabalho) {
      // Ramo 1: Apresentador(a) com trabalho
      const textoInicial = `Certificamos que ${nome}${textoDocumento} apresentou o trabalho `;
      const textoTrabalho = `"${nomeTrabalho}"`;
      const trechoLocal = tipoAtividade === "Evento"
        ? "no evento"
        : `em nosso(a) ${tipoLower}`;
      const nomeEventoFmt = nomeEvento ? `"${nomeEvento}"` : "";
      const textoFinalBase = [trechoLocal, nomeEventoFmt].filter(Boolean).join(" ");
      const textoFinal = `${textoFinalBase}${textoData} com carga horária de ${cargaHoraria}.`;

      const estiloTrabalho = input.useItalic ? "italic" : "regular";
      segments.push({ text: textoInicial, style: "regular" });
      segments.push({ text: textoTrabalho, style: estiloTrabalho });
      segments.push({ text: ` ${textoFinal}`, style: "regular" });
    } else if (isOrganizador && tipoAtividade !== "Evento") {
      // Ramo 2: Organizador(a), atividade ≠ Evento
      const doc = textoDocumento || ",";
      const textoInicial = `Certificamos que ${nome}${doc} participou ${trechoAtividade} `;
      const textoEvento = nomeEvento ? `"${nomeEvento}"` : "";
      const textoFinal = ` na qualidade de comissão organizadora, com carga horária de ${cargaHoraria}.`;
      const estiloEvento = input.useItalic && nomeEvento ? "italic" : "regular";

      segments.push({ text: textoInicial, style: "regular" });
      segments.push({ text: textoEvento, style: estiloEvento });
      segments.push({ text: textoData, style: "regular" });
      segments.push({ text: textoFinal, style: "regular" });
    } else {
      // Ramo 3: Demais funções
      const doc = textoDocumento || ",";
      const textoInicial = `Certificamos que ${nome}${doc} participou como ${funcaoLower} ${trechoAtividade} `;
      const textoEvento = nomeEvento ? `"${nomeEvento}"` : "";
      const textoFinal = ` com carga horária de ${cargaHoraria}.`;
      const estiloEvento = input.useItalic && nomeEvento ? "italic" : "regular";

      segments.push({ text: textoInicial, style: "regular" });
      segments.push({ text: textoEvento, style: estiloEvento });
      segments.push({ text: textoData, style: "regular" });
      segments.push({ text: textoFinal, style: "regular" });
    }

    return { segments };
  }

  /** Constrói o trecho de documento (CPF formatado, Matrícula, ou vazio). */
  private buildDocText(docTipo: DocTipo, docNumero: string): string {
    if (docTipo === "CPF" && docNumero) {
      const cpf = this.formatCpf(docNumero);
      return `, portador(a) do CPF ${cpf},`;
    }
    if (docTipo === "Matrícula" && docNumero) {
      return `, portador(a) da matrícula nº ${docNumero},`;
    }
    return "";
  }

  /** Formata CPF: extrai 11 dígitos e aplica máscara 000.000.000-00. */
  private formatCpf(numero: string): string {
    const digits = (numero || "").replace(/\D/g, "");
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    }
    return numero;
  }

  /** Constrói o trecho de data/período. */
  private buildDateText(useDate: boolean, inicio: string, fim: string): string {
    if (!useDate) return "";
    const i = (inicio || "").trim();
    const f = (fim || "").trim();
    if (i && f) return `, ocorrida no período de ${i} a ${f},`;
    if (i) return `, ocorrida em ${i},`;
    if (f) return `, ocorrida em ${f},`;
    return "";
  }

  /** Normaliza carga horária: garante sufixo "h". */
  private normalizeCargaHoraria(h: string): string {
    if (!h) return "[Horas]";
    return h.endsWith("h") ? h : `${h}h`;
  }

  /** Indica se o tipo de atividade desativa o campo "Nome do Evento". */
  static atividadeSemNome(tipoAtividade: string): boolean {
    return ATIVIDADES_SEM_NOME.includes(tipoAtividade);
  }
}
