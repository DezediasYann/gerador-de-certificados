// EventRepository — persistência de eventos (OOP).
// Camada fina sobre PreferencesStore: serializa/deserializa a lista de eventos.
import { PreferencesStore } from "../storage/PreferencesStore";
import type { Evento } from "./types";

const STORAGE_KEY = "events";

export class EventRepository {
  private prefs = new PreferencesStore();
  private cache: Evento[] | null = null;

  /** Lista todos os eventos (do mais recente para o mais antigo). */
  async list(): Promise<Evento[]> {
    if (this.cache) return [...this.cache].sort(byUpdatedAtDesc);
    const all = await this.prefs.get<Evento[]>(STORAGE_KEY, []);
    this.cache = all;
    return [...all].sort(byUpdatedAtDesc);
  }

  /** Busca um evento pelo ID. */
  async get(id: string): Promise<Evento | null> {
    const all = await this.list();
    return all.find((e) => e.id === id) ?? null;
  }

  /** Cria ou atualiza um evento (upsert). */
  async save(evento: Evento): Promise<void> {
    const all = await this.list();
    const idx = all.findIndex((e) => e.id === evento.id);
    if (idx >= 0) all[idx] = evento;
    else all.push(evento);
    this.cache = all;
    await this.prefs.set(STORAGE_KEY, all);
  }

  /** Atualiza parcialmente um evento. */
  async patch(id: string, patch: Partial<Evento>): Promise<Evento | null> {
    const all = await this.list();
    const idx = all.findIndex((e) => e.id === id);
    if (idx < 0) return null;
    const updated: Evento = {
      ...all[idx],
      ...patch,
      id: all[idx].id, // id imutável
      updatedAt: new Date().toISOString(),
    };
    all[idx] = updated;
    this.cache = all;
    await this.prefs.set(STORAGE_KEY, all);
    return updated;
  }

  /** Remove um evento pelo ID. */
  async delete(id: string): Promise<void> {
    const all = await this.list();
    this.cache = all.filter((e) => e.id !== id);
    await this.prefs.set(STORAGE_KEY, this.cache);
  }

  /** Invalida o cache (força próxima leitura a vir do storage). */
  invalidate(): void {
    this.cache = null;
  }
}

function byUpdatedAtDesc(a: Evento, b: Evento): number {
  return b.updatedAt.localeCompare(a.updatedAt);
}
