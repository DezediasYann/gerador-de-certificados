// ExcelBatchProcessor — gera o modelo Excel e processa planilhas de lote.
// Porte da lógica de generate_excel_template e process_batch_file do app.py original.
import * as XLSX from "xlsx";
import type { BatchRow, DocTipo } from "./types";

/** Cabeçalhos esperados na planilha de importação (espelho do original). */
const HEADERS = {
  nome: "Nome da Pessoa",
  docTipo: "Tipo de Documento",
  docNumero: "Nº do Documento",
  funcao: "Função do Participante",
  funcaoCustom: "Função Customizada (se Outro)",
  trabalho: "Nome do Trabalho (se Apresentador)",
} as const;

export class ExcelBatchProcessor {
  /**
   * Cria um Blob .xlsx com o modelo de importação, pré-preenchido com uma linha de exemplo.
   * Espelho de generate_excel_template do app.py.
   */
  createTemplateBlob(): Blob {
    const data = [
      {
        [HEADERS.nome]: "João Silva",
        [HEADERS.docTipo]: "CPF",
        [HEADERS.docNumero]: "000.000.000-00",
        [HEADERS.funcao]: "Apresentador(a)",
        [HEADERS.funcaoCustom]: "",
        [HEADERS.trabalho]: "Impacto da IA na Educação",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    // Larguras de coluna amigáveis
    ws["!cols"] = [
      { wch: 24 }, { wch: 18 }, { wch: 20 }, { wch: 22 }, { wch: 28 }, { wch: 38 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Participantes");
    const arr = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    return new Blob([arr], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  }

  /**
   * Lê uma planilha .xlsx ou .csv e devolve as linhas normalizadas.
   * Suporta CSV com separador ';' (comum no Brasil).
   */
  async readRows(file: File): Promise<BatchRow[]> {
    const buf = await file.arrayBuffer();
    const wb =
      file.name.toLowerCase().endsWith(".csv")
        ? XLSX.read(buf, { type: "array", FS: ";", raw: false })
        : XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
    return json.map((r) => this.normalizeRow(r));
  }

  /** Normaliza uma linha bruta da planilha para BatchRow. */
  private normalizeRow(r: Record<string, unknown>): BatchRow {
    const str = (v: unknown) => (v == null ? "" : String(v).trim());
    let docTipo = str(r[HEADERS.docTipo]) || "Nenhum";
    if (!["Nenhum", "CPF", "Matrícula"].includes(docTipo)) docTipo = "Nenhum";

    let funcao = str(r[HEADERS.funcao]);
    if (funcao === "Outro") funcao = str(r[HEADERS.funcaoCustom]) || "Outro";

    return {
      nome: str(r[HEADERS.nome]),
      docTipo: docTipo as DocTipo,
      docNumero: str(r[HEADERS.docNumero]),
      funcaoParticipante: funcao,
      nomeTrabalho: str(r[HEADERS.trabalho]),
    };
  }

  /** Gera o nome de arquivo para um certificado de lote (espelho do original). */
  static buildFilename(nome: string, funcao: string, collisionIndex = 0): string {
    const nomeF = (nome || "certificado").toUpperCase().replace(/\s+/g, "_");
    const funcF = (funcao || "").toUpperCase().replace(/\(A\)/g, "").replace(/\s+/g, "_");
    const base = `${nomeF}-${funcF}`;
    return collisionIndex === 0 ? `${base}.pdf` : `${base}_${collisionIndex}.pdf`;
  }
}
