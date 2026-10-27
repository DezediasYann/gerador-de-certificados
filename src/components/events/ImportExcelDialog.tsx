"use client";
import { useState } from "react";
import { useEventStore, newParticipanteFromRow } from "@/store/event-store";
import { ExcelBatchProcessor } from "@/lib/cert/ExcelBatchProcessor";
import { openFile } from "@/lib/tauri/TauriBridge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, FolderOpen, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { Participante } from "@/lib/events/types";

interface ImportExcelDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  eventoId: string;
}

/** Diálogo de importação de planilha Excel/CSV como participantes do evento. */
export function ImportExcelDialog({ open, onOpenChange, eventoId }: ImportExcelDialogProps) {
  const importParticipantes = useEventStore((s) => s.importParticipantes);
  const [phase, setPhase] = useState<"idle" | "reading" | "done">("idle");
  const [count, setCount] = useState(0);

  const handleImport = async () => {
    setPhase("reading");
    try {
      const fileRes = await openFile([
        { name: "Planilhas", extensions: ["xlsx", "csv"] },
      ]);
      if (!fileRes) {
        setPhase("idle");
        return;
      }
      const file = new File([fileRes.data], fileRes.name);
      const processor = new ExcelBatchProcessor();
      const rows = await processor.readRows(file);
      if (rows.length === 0) {
        toast.warning("Nenhuma linha encontrada na planilha.");
        setPhase("idle");
        return;
      }
      const novos: Participante[] = rows.map((r) => newParticipanteFromRow(r));
      await importParticipantes(eventoId, novos);
      setCount(novos.length);
      setPhase("done");
      toast.success(`${novos.length} participantes importados.`);
    } catch (err) {
      toast.error("Erro ao importar planilha", {
        description: err instanceof Error ? err.message : undefined,
      });
      setPhase("idle");
    }
  };

  const reset = () => {
    setPhase("idle");
    setCount(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && reset()}>
      <DialogContent className="glass-strong max-w-md">
        <DialogHeader>
          <DialogTitle>Importar participantes</DialogTitle>
          <DialogDescription>
            Selecione uma planilha Excel/CSV com os participantes. As colunas esperadas são as
            mesmas do modelo Excel disponibilizado.
          </DialogDescription>
        </DialogHeader>

        {phase === "idle" && (
          <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Colunas esperadas:</p>
            <ul className="list-disc space-y-0.5 pl-4">
              <li>Nome da Pessoa</li>
              <li>Tipo de Documento (Nenhum/CPF/Matrícula)</li>
              <li>Nº do Documento</li>
              <li>Função do Participante</li>
              <li>Função Customizada (se Outro)</li>
              <li>Nome do Trabalho (se Apresentador)</li>
            </ul>
            <p className="mt-2">
              Os participantes importados são <strong>adicionados</strong> aos já existentes (não substituem).
            </p>
          </div>
        )}

        {phase === "reading" && (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Lendo planilha…
          </div>
        )}

        {phase === "done" && (
          <div className="flex items-center gap-2 py-4 text-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span>{count} participantes importados com sucesso.</span>
          </div>
        )}

        <DialogFooter>
          {phase === "idle" && (
            <>
              <Button variant="outline" onClick={reset}>
                Cancelar
              </Button>
              <Button onClick={handleImport} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <FolderOpen className="mr-1.5 h-4 w-4" /> Selecionar planilha
              </Button>
            </>
          )}
          {phase === "done" && <Button onClick={reset}>Concluir</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
