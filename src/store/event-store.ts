// event-store — estado global do paradigma orientado a eventos.
// Gerencia: navegação entre views (home/wizard/event), CRUD de eventos,
// CRUD de participantes com salvamento dinâmico (debounce leve).
import { create } from "zustand";
import type { Evento, EventDraft, Participante } from "@/lib/events/types";
import { generateId } from "@/lib/events/types";
import { EventRepository } from "@/lib/events/EventRepository";
import { PreferencesStore } from "@/lib/storage/PreferencesStore";
import { FUNCOES_HORAS } from "@/lib/cert/Catalogs";
import type { DocTipo } from "@/lib/cert/types";

type View = "home" | "wizard" | "event" | "settings";

interface EventState {
  view: View;
  events: Evento[];
  currentEventId: string | null;
  wizardStep: 1 | 2;
  wizardDraft: EventDraft | null;
  loaded: boolean;
  betaUpdates: boolean;

  // Navegação
  init: () => Promise<void>;
  goHome: () => void;
  goSettings: () => void;
  startWizard: () => void;
  setWizardStep: (step: 1 | 2) => void;
  updateWizardDraft: (patch: Partial<EventDraft>) => void;
  finishWizard: () => Promise<Evento>;
  openEvent: (id: string) => void;

  // CRUD de eventos
  updateEvent: (id: string, patch: Partial<Evento>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;

  // CRUD de participantes
  addParticipante: (eventId: string) => Promise<void>;
  updateParticipante: (eventId: string, participanteId: string, patch: Partial<Participante>) => Promise<void>;
  removeParticipante: (eventId: string, participanteId: string) => Promise<void>;
  importParticipantes: (eventId: string, participantes: Participante[]) => Promise<void>;

  // Configurações
  setBetaUpdates: (v: boolean) => void;
  checkUpdateOnLaunch: () => boolean;
}

const repo = new EventRepository();

const DEFAULT_DRAFT: EventDraft = {
  nome: "",
  tipoAtividade: "Evento",
  templateName: "",
  templateSource: "upload",
  templateDataUrl: null,
  nomeEvento: "",
  cargaHorariaPadrao: "",
  useDate: false,
  dataInicio: "",
  dataFim: "",
  appearance: {
    fontName: "OpenSans",
    fontSize: 50,
    useItalic: true,
    posX: 250,
    posY: 600,
  },
  signature: {
    useSignature: false,
    signatureName: "",
    signatureDataUrl: null,
    signatureSize: 300,
    signaturePosX: 0,
    signaturePosY: 0,
  },
};

export const useEventStore = create<EventState>((set, get) => ({
  view: "home",
  events: [],
  currentEventId: null,
  wizardStep: 1,
  wizardDraft: null,
  loaded: false,
  betaUpdates: false,

  init: async () => {
    if (get().loaded) return;
    const events = await repo.list();
    // Carrega preferência de beta updates
    const prefs = new PreferencesStore();
    const beta = await prefs.get<boolean>("beta_updates", false);
    set({ events, loaded: true, betaUpdates: beta });
  },

  goHome: () => set({ view: "home", currentEventId: null, wizardDraft: null, wizardStep: 1 }),

  goSettings: () => set({ view: "settings", currentEventId: null, wizardDraft: null }),

  startWizard: () => {
    // Reseta o draft com defaults (copia profunda)
    const draft: EventDraft = JSON.parse(JSON.stringify(DEFAULT_DRAFT));
    set({ view: "wizard", wizardDraft: draft, wizardStep: 1 });
  },

  setWizardStep: (step) => set({ wizardStep: step }),

  updateWizardDraft: (patch) => {
    const draft = get().wizardDraft;
    if (!draft) return;
    set({ wizardDraft: { ...draft, ...patch } });
  },

  finishWizard: async () => {
    const draft = get().wizardDraft;
    if (!draft) throw new Error("Draft do wizard ausente");
    const now = new Date().toISOString();
    const evento: Evento = {
      ...draft,
      id: generateId(),
      nomeEvento: draft.nomeEvento || draft.nome,
      participantes: [],
      createdAt: now,
      updatedAt: now,
    };
    await repo.save(evento);
    const events = await repo.list();
    set({ events, view: "event", currentEventId: evento.id, wizardDraft: null, wizardStep: 1 });
    return evento;
  },

  openEvent: (id) => set({ view: "event", currentEventId: id }),

  updateEvent: async (id, patch) => {
    const updated = await repo.patch(id, patch);
    if (!updated) return;
    set((s) => ({
      events: s.events.map((e) => (e.id === id ? updated : e)),
    }));
  },

  deleteEvent: async (id) => {
    await repo.delete(id);
    set((s) => ({
      events: s.events.filter((e) => e.id !== id),
      view: s.currentEventId === id ? "home" : s.view,
      currentEventId: s.currentEventId === id ? null : s.currentEventId,
    }));
  },

  addParticipante: async (eventId) => {
    const evento = get().events.find((e) => e.id === eventId);
    if (!evento) return;
    const now = new Date().toISOString();
    const novo: Participante = {
      id: generateId(),
      nome: "",
      docTipo: "Nenhum",
      docNumero: "",
      funcao: "Ouvinte",
      funcaoCustom: "",
      nomeTrabalho: "",
      cargaHoraria: "",
      createdAt: now,
      updatedAt: now,
    };
    const updated: Evento = {
      ...evento,
      participantes: [...evento.participantes, novo],
      updatedAt: now,
    };
    await repo.save(updated);
    set((s) => ({
      events: s.events.map((e) => (e.id === eventId ? updated : e)),
    }));
  },

  updateParticipante: async (eventId, participanteId, patch) => {
    const evento = get().events.find((e) => e.id === eventId);
    if (!evento) return;
    const now = new Date().toISOString();
    const updated: Evento = {
      ...evento,
      participantes: evento.participantes.map((p) =>
        p.id === participanteId
          ? { ...p, ...patch, updatedAt: now }
          : p,
      ),
      updatedAt: now,
    };
    await repo.save(updated);
    set((s) => ({
      events: s.events.map((e) => (e.id === eventId ? updated : e)),
    }));
  },

  removeParticipante: async (eventId, participanteId) => {
    const evento = get().events.find((e) => e.id === eventId);
    if (!evento) return;
    const now = new Date().toISOString();
    const updated: Evento = {
      ...evento,
      participantes: evento.participantes.filter((p) => p.id !== participanteId),
      updatedAt: now,
    };
    await repo.save(updated);
    set((s) => ({
      events: s.events.map((e) => (e.id === eventId ? updated : e)),
    }));
  },

  importParticipantes: async (eventId, participantes) => {
    const evento = get().events.find((e) => e.id === eventId);
    if (!evento) return;
    const now = new Date().toISOString();
    // Mescla: adiciona os importados (não sobrescreve existentes)
    const updated: Evento = {
      ...evento,
      participantes: [...evento.participantes, ...participantes],
      updatedAt: now,
    };
    await repo.save(updated);
    set((s) => ({
      events: s.events.map((e) => (e.id === eventId ? updated : e)),
    }));
  },

  setBetaUpdates: (v) => {
    const prefs = new PreferencesStore();
    void prefs.set("beta_updates", v);
    set({ betaUpdates: v });
  },

  checkUpdateOnLaunch: () => get().betaUpdates || true, // sempre verifica; beta é filtro
}));

// Helpers exportados para uso nos componentes
export function newParticipanteFromRow(
  row: { nome: string; docTipo: DocTipo; docNumero: string; funcao: string; nomeTrabalho: string },
): Participante {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    nome: row.nome,
    docTipo: row.docTipo,
    docNumero: row.docNumero,
    funcao: row.funcao || "Ouvinte",
    funcaoCustom: row.funcao === "Outro" ? row.funcao : "",
    nomeTrabalho: row.nomeTrabalho,
    cargaHoraria: FUNCOES_HORAS[row.funcao] ?? "",
    createdAt: now,
    updatedAt: now,
  };
}
