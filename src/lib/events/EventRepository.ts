// EventRepository — persistência de eventos (OOP) em arquivo de dados separado.
// Os eventos são salvos em `events.json` no diretório de dados do app
// (Tauri: ~/Library/Application Support/com.certificados.gen/ no macOS,
//  %APPDATA%/com.certificados.gen/ no Windows, ~/.local/share/com.certificados.gen/ no Linux).
// No browser (dev), usa localStorage como fallback.
// O arquivo é de dados do usuário — NÃO é compilado no binário.
import type { Evento } from "./types";
import { isTauri } from "../tauri/TauriBridge";

export class EventRepository {
  private cache: Evento[] | null = null;
  private dataFilePath: string | null = null;

  /** Resolve o caminho do arquivo events.json no diretório de dados do app. */
  private async resolveDataFile(): Promise<{ path: string } | null> {
    if (!isTauri()) return null;
    try {
      const { appDataDir } = await import("@tauri-apps/api/path");
      const { exists, mkdir } = await import("@tauri-apps/plugin-fs");
      const dir = await appDataDir();
      if (!(await exists(dir))) {
        await mkdir(dir, { recursive: true });
      }
      return { path: `${dir}/events.json` };
    } catch (err) {
      console.warn("EventRepository: não foi possível resolver appDataDir:", err);
      return null;
    }
  }

  /** Lê o arquivo de eventos (Tauri) ou localStorage (browser). */
  private async readRaw(): Promise<Evento[]> {
    // Tauri: lê do arquivo events.json
    const file = await this.resolveDataFile();
    if (file) {
      try {
        const { readTextFile, exists } = await import("@tauri-apps/plugin-fs");
        if (await exists(file.path)) {
          const text = await readTextFile(file.path);
          return JSON.parse(text) as Evento[];
        }
        return [];
      } catch (err) {
        console.error("EventRepository: erro ao ler events.json:", err);
        return [];
      }
    }
    // Browser: fallback localStorage
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem("geradorcert_events");
      return raw ? (JSON.parse(raw) as Evento[]) : [];
    }
    return [];
  }

  /** Escreve o arquivo de eventos (Tauri) ou localStorage (browser). */
  private async writeRaw(events: Evento[]): Promise<void> {
    // Tauri: escreve no arquivo events.json
    const file = await this.resolveDataFile();
    if (file) {
      try {
        const { writeTextFile } = await import("@tauri-apps/plugin-fs");
        await writeTextFile(file.path, JSON.stringify(events, null, 2));
        return;
      } catch (err) {
        console.error("EventRepository: erro ao escrever events.json:", err);
        return;
      }
    }
    // Browser: fallback localStorage
    if (typeof window !== "undefined") {
      window.localStorage.setItem("geradorcert_events", JSON.stringify(events));
    }
  }

  /** Lista todos os eventos (do mais recente para o mais antigo). */
  async list(): Promise<Evento[]> {
    if (this.cache) return [...this.cache].sort(byUpdatedAtDesc);
    const all = await this.readRaw();
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
    await this.writeRaw(all);
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
    await this.writeRaw(all);
    return updated;
  }

  /** Remove um evento pelo ID. */
  async delete(id: string): Promise<void> {
    const all = await this.list();
    this.cache = all.filter((e) => e.id !== id);
    await this.writeRaw(this.cache);
  }

  /** Invalida o cache (força próxima leitura a vir do storage). */
  invalidate(): void {
    this.cache = null;
  }
}

function byUpdatedAtDesc(a: Evento, b: Evento): number {
  return b.updatedAt.localeCompare(a.updatedAt);
}
