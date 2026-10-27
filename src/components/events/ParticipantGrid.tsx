"use client";
import { useState } from "react";
import { useEventStore } from "@/store/event-store";
import type { Evento, Participante } from "@/lib/events/types";
import { CertificateGenerator } from "@/lib/events/CertificateGenerator";
import { saveBlob } from "@/lib/tauri/TauriBridge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FUNCOES_HORAS } from "@/lib/cert/Catalogs";
import type { DocTipo } from "@/lib/cert/types";
import { Download, Plus, Trash2, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ImportExcelDialog } from "./ImportExcelDialog";

/** Grid editável de participantes com salvamento dinâmico. */
export function ParticipantGrid({ evento }: { evento: Evento }) {
  const addParticipante = useEventStore((s) => s.addParticipante);
  const updateParticipante = useEventStore((s) => s.updateParticipante);
  const removeParticipante = useEventStore((s) => s.removeParticipante);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const handleDownloadOne = async (p: Participante) => {
    if (!p.nome.trim()) {
      toast.warning("Preencha o nome do participante antes de baixar.");
      return;
    }
    setDownloadingId(p.id);
    try {
      const gen = new CertificateGenerator();
      const { blob, filename } = await gen.generate(evento, p);
      await saveBlob(blob, filename, [{ name: "PDF", extensions: ["pdf"] }]);
      toast.success(`Certificado gerado: ${filename}`);
    } catch (err) {
      toast.error("Erro ao gerar certificado", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Toolbar da grade */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => addParticipante(evento.id)}>
          <Plus className="mr-1.5 h-4 w-4" /> Adicionar participante
        </Button>
        <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
          <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Importar Excel
        </Button>
        <p className="ml-auto text-xs text-muted-foreground">
          {evento.participantes.length} participante{evento.participantes.length === 1 ? "" : "s"}
        </p>
      </div>

      {/* Cabeçalho da tabela (desktop) */}
      <div className="hidden overflow-hidden rounded-lg border border-border/60 lg:block">
        <div className="grid grid-cols-[2.2fr_1.6fr_1.4fr_1.6fr_0.9fr_88px] gap-2 bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
          <div>Nome</div>
          <div>Documento</div>
          <div>Função</div>
          <div>Trabalho (se Apresentador)</div>
          <div>Carga horária</div>
          <div className="text-right">Ações</div>
        </div>
        <div className="divide-y divide-border/40">
          {evento.participantes.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhum participante. Clique em "Adicionar participante" ou importe um Excel.
            </div>
          )}
          {evento.participantes.map((p) => (
            <ParticipantRow
              key={p.id}
              participante={p}
              eventoId={evento.id}
              cargaPadrao={evento.cargaHorariaPadrao}
              onUpdate={updateParticipante}
              onRemove={removeParticipante}
              onDownload={() => handleDownloadOne(p)}
              downloading={downloadingId === p.id}
            />
          ))}
        </div>
      </div>

      {/* Lista empilhada (mobile) */}
      <div className="space-y-2 lg:hidden">
        {evento.participantes.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum participante. Adicione ou importe um Excel.
          </div>
        )}
        {evento.participantes.map((p) => (
          <ParticipantCard
            key={p.id}
            participante={p}
            eventoId={evento.id}
            cargaPadrao={evento.cargaHorariaPadrao}
            onUpdate={updateParticipante}
            onRemove={removeParticipante}
            onDownload={() => handleDownloadOne(p)}
            downloading={downloadingId === p.id}
          />
        ))}
      </div>

      <ImportExcelDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        eventoId={evento.id}
      />
    </div>
  );
}

/** Linha da tabela (desktop). */
function ParticipantRow({
  participante,
  eventoId,
  cargaPadrao,
  onUpdate,
  onRemove,
  onDownload,
  downloading,
}: {
  participante: Participante;
  eventoId: string;
  cargaPadrao: string;
  onUpdate: (eventId: string, pId: string, patch: Partial<Participante>) => Promise<void>;
  onRemove: (eventId: string, pId: string) => Promise<void>;
  onDownload: () => void;
  downloading: boolean;
}) {
  const isApresentador = participante.funcao === "Apresentador(a)";
  const isOutro = participante.funcao === "Outro";

  const set = (patch: Partial<Participante>) => onUpdate(eventoId, participante.id, patch);

  const setFuncao = (funcao: string) => {
    set({
      funcao,
      funcaoCustom: funcao === "Outro" ? participante.funcaoCustom : "",
      nomeTrabalho: funcao === "Apresentador(a)" ? participante.nomeTrabalho : "",
      cargaHoraria: participante.cargaHoraria || FUNCOES_HORAS[funcao] || "",
    });
  };

  return (
    <div className="grid grid-cols-[2.2fr_1.6fr_1.4fr_1.6fr_0.9fr_88px] items-center gap-2 px-3 py-2 text-sm">
      <input
        className="w-full rounded border border-transparent bg-transparent px-1 py-1 text-sm hover:border-border focus:border-border focus:bg-background focus:outline-none"
        value={participante.nome}
        onChange={(e) => set({ nome: e.target.value })}
        placeholder="Nome do participante"
      />
      <div className="flex items-center gap-1">
        <Select
          value={participante.docTipo}
          onValueChange={(v) => set({ docTipo: v as DocTipo })}
        >
          <SelectTrigger className="h-8 w-[88px] shrink-0 border-transparent bg-transparent px-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Nenhum">Nenhum</SelectItem>
            <SelectItem value="CPF">CPF</SelectItem>
            <SelectItem value="Matrícula">Matr.</SelectItem>
          </SelectContent>
        </Select>
        {participante.docTipo !== "Nenhum" && (
          <input
            className="w-full min-w-[80px] rounded border border-transparent bg-transparent px-2 py-1 text-sm hover:border-border focus:border-border focus:bg-background focus:outline-none"
            value={participante.docNumero}
            onChange={(e) => set({ docNumero: e.target.value })}
            placeholder="Nº"
          />
        )}
      </div>
      <div className="flex items-center gap-1">
        <Select value={participante.funcao} onValueChange={setFuncao}>
          <SelectTrigger className="h-8 w-full min-w-0 border-transparent bg-transparent px-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(FUNCOES_HORAS).map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isOutro && (
          <input
            className="w-full min-w-0 rounded border border-transparent bg-transparent px-1 py-1 text-sm hover:border-border focus:border-border focus:bg-background focus:outline-none"
            value={participante.funcaoCustom}
            onChange={(e) => set({ funcaoCustom: e.target.value })}
            placeholder="Especifique"
          />
        )}
      </div>
      <input
        className="w-full rounded border border-transparent bg-transparent px-1 py-1 text-sm hover:border-border focus:border-border focus:bg-background focus:outline-none disabled:opacity-40"
        value={participante.nomeTrabalho}
        onChange={(e) => set({ nomeTrabalho: e.target.value })}
        placeholder={isApresentador ? "Título do trabalho" : "—"}
        disabled={!isApresentador}
      />
      <input
        className="w-full rounded border border-transparent bg-transparent px-1 py-1 text-sm hover:border-border focus:border-border focus:bg-background focus:outline-none"
        value={participante.cargaHoraria}
        onChange={(e) => set({ cargaHoraria: e.target.value })}
        placeholder={cargaPadrao || "Ex.: 5h"}
      />
      <div className="flex items-center justify-end gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={onDownload}
          disabled={downloading}
          aria-label="Baixar certificado"
          title="Baixar certificado"
        >
          {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(eventoId, participante.id)}
          aria-label="Remover participante"
          title="Remover"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/** Card empilhado (mobile). */
function ParticipantCard({
  participante,
  eventoId,
  cargaPadrao,
  onUpdate,
  onRemove,
  onDownload,
  downloading,
}: {
  participante: Participante;
  eventoId: string;
  cargaPadrao: string;
  onUpdate: (eventId: string, pId: string, patch: Partial<Participante>) => Promise<void>;
  onRemove: (eventId: string, pId: string) => Promise<void>;
  onDownload: () => void;
  downloading: boolean;
}) {
  const isApresentador = participante.funcao === "Apresentador(a)";
  const isOutro = participante.funcao === "Outro";
  const set = (patch: Partial<Participante>) => onUpdate(eventoId, participante.id, patch);
  const setFuncao = (funcao: string) => {
    set({
      funcao,
      funcaoCustom: funcao === "Outro" ? participante.funcaoCustom : "",
      nomeTrabalho: funcao === "Apresentador(a)" ? participante.nomeTrabalho : "",
      cargaHoraria: participante.cargaHoraria || FUNCOES_HORAS[funcao] || "",
    });
  };

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-card/40 p-3">
      <input
        className="w-full rounded border border-border bg-transparent px-2 py-1.5 text-sm focus:bg-background focus:outline-none"
        value={participante.nome}
        onChange={(e) => set({ nome: e.target.value })}
        placeholder="Nome do participante"
      />
      <div className="grid grid-cols-2 gap-2">
        <Select value={participante.docTipo} onValueChange={(v) => set({ docTipo: v as DocTipo })}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Nenhum">Nenhum</SelectItem>
            <SelectItem value="CPF">CPF</SelectItem>
            <SelectItem value="Matrícula">Matrícula</SelectItem>
          </SelectContent>
        </Select>
        {participante.docTipo !== "Nenhum" && (
          <Input
            className="h-9 text-xs"
            value={participante.docNumero}
            onChange={(e) => set({ docNumero: e.target.value })}
            placeholder="Nº do documento"
          />
        )}
      </div>
      <Select value={participante.funcao} onValueChange={setFuncao}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.keys(FUNCOES_HORAS).map((f) => (
            <SelectItem key={f} value={f}>
              {f}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isOutro && (
        <Input
          className="h-9 text-xs"
          value={participante.funcaoCustom}
          onChange={(e) => set({ funcaoCustom: e.target.value })}
          placeholder="Especifique a função"
        />
      )}
      {isApresentador && (
        <Input
          className="h-9 text-xs"
          value={participante.nomeTrabalho}
          onChange={(e) => set({ nomeTrabalho: e.target.value })}
          placeholder="Título do trabalho"
        />
      )}
      <div className="flex items-center gap-2">
        <Input
          className="h-9 flex-1 text-xs"
          value={participante.cargaHoraria}
          onChange={(e) => set({ cargaHoraria: e.target.value })}
          placeholder={cargaPadrao || "Carga horária (Ex.: 5h)"}
        />
        <Button size="icon" variant="outline" className="h-9 w-9" onClick={onDownload} disabled={downloading}>
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(eventoId, participante.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
