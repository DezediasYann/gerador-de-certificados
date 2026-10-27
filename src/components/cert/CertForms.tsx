"use client";
import { useCertStore } from "@/store/cert-store";
import { FUNCOES_HORAS, TIPOS_DE_ATIVIDADE, ATIVIDADES_SEM_NOME } from "@/lib/cert/Catalogs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

/** Aba Participante — dados da pessoa e documento. */
export function ParticipantForm() {
  const s = useCertStore();
  const isOutro = s.funcao === "Outro";
  const isApresentador = s.funcao === "Apresentador(a)";

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome Completo</Label>
        <Input
          id="nome"
          value={s.nome}
          onChange={(e) => s.set({ nome: e.target.value })}
          placeholder="Ex.: Maria Souza"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="funcao">Função</Label>
        <Select value={s.funcao} onValueChange={s.setFuncao}>
          <SelectTrigger id="funcao">
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
      </div>

      {isOutro && (
        <div className="space-y-2">
          <Label htmlFor="funcaoCustom">Especifique a função</Label>
          <Input
            id="funcaoCustom"
            value={s.funcaoCustom}
            onChange={(e) => s.set({ funcaoCustom: e.target.value })}
            placeholder="Ex.: Monitor(a)"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="docTipo">Tipo de Documento</Label>
          <Select
            value={s.docTipo}
            onValueChange={(v) => s.set({ docTipo: v as typeof s.docTipo })}
          >
            <SelectTrigger id="docTipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Nenhum">Nenhum</SelectItem>
              <SelectItem value="CPF">CPF</SelectItem>
              <SelectItem value="Matrícula">Matrícula</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="docNumero">Nº Documento</Label>
          <Input
            id="docNumero"
            value={s.docNumero}
            onChange={(e) => s.set({ docNumero: e.target.value })}
            placeholder={s.docTipo === "CPF" ? "000.000.000-00" : "—"}
            disabled={s.docTipo === "Nenhum"}
          />
        </div>
      </div>

      {isApresentador && (
        <div className="space-y-2">
          <Label htmlFor="trabalho">Título do Trabalho</Label>
          <Input
            id="trabalho"
            value={s.nomeTrabalho}
            onChange={(e) => s.set({ nomeTrabalho: e.target.value })}
            placeholder="Ex.: Impacto da IA na Educação"
          />
        </div>
      )}
    </div>
  );
}

/** Aba Evento — dados do evento/atividade. */
export function EventForm() {
  const s = useCertStore();
  const semNome = ATIVIDADES_SEM_NOME.includes(s.tipoAtividade);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="atividade">Tipo de Atividade</Label>
        <Select value={s.tipoAtividade} onValueChange={s.setTipoAtividade}>
          <SelectTrigger id="atividade">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_DE_ATIVIDADE.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="evento">Nome do Evento</Label>
        <Input
          id="evento"
          value={s.nomeEvento}
          onChange={(e) => s.set({ nomeEvento: e.target.value })}
          placeholder={semNome ? "Não aplicável a este tipo" : "Ex.: VII Semana de História"}
          disabled={semNome}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="horas">Carga Horária</Label>
        <Input
          id="horas"
          value={s.cargaHoraria}
          onChange={(e) => s.set({ cargaHoraria: e.target.value })}
          placeholder="Ex.: 10h"
        />
      </div>

      <div className="flex items-center space-x-2 pt-1">
        <Checkbox
          id="useDate"
          checked={s.useDate}
          onCheckedChange={(v) => s.set({ useDate: Boolean(v) })}
        />
        <Label htmlFor="useDate" className="cursor-pointer">
          Incluir Data/Período
        </Label>
      </div>

      {s.useDate && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="dataInicio">Data (Início)</Label>
            <Input
              id="dataInicio"
              value={s.dataInicio}
              onChange={(e) => s.set({ dataInicio: e.target.value })}
              placeholder="Ex.: 23/03/2026"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dataFim">Data (Fim)</Label>
            <Input
              id="dataFim"
              value={s.dataFim}
              onChange={(e) => s.set({ dataFim: e.target.value })}
              placeholder="Opcional"
            />
          </div>
        </div>
      )}
    </div>
  );
}
