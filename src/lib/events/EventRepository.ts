// EventRepository — persistência de eventos (OOP) em arquivo de dados separado.
// Os eventos são salvos em `events.json` no diretório de dados do app
// (Tauri: ~/Library/Application Support/com.certificados.gen/ no macOS,
//  %APPDATA%/com.certificados.gen/ no Windows, ~/.local/share/com.certificados.gen/ no Linux).
// No browser (dev), usa localStorage como fallback.
// O arquivo é de dados do usuário — NÃO é compilado no binário.
import type { Evento } from "./types";
import { isTauri } from "../tauri/TauriBridge";

/** Dimensões de template assumidas na migração absolute→center (padrão histórico). */
const MIGRATION_TEMPLATE_W = 2000;
const MIGRATION_TEMPLATE_H = 1414;
const MIGRATION_CX = MIGRATION_TEMPLATE_W / 2; // 1000
const MIGRATION_CY = MIGRATION_TEMPLATE_H / 2; // 707

/**
 * Migra um evento do sistema de coordenadas absoluto (legacy) para o centrado.
 *   • Texto:   old posX era LEFT edge → new posX = (old.posX + old.textWidth/2) - CX
 *               old posY era TOP edge  → new posY = old.posY - CY
 *   • Assinatura/QR: old posX/Y era TOP-LEFT → new posX/Y = (old.posX + size/2) - CX, idem Y
 *
 * Eventos já marcados com coordSystem="center" são retornados inalterados.
 */
function migrateToCenterCoords(event: Evento): Evento {
  if (event.appearance?.coordSystem === "center") return event;

  const app = event.appearance;
  const oldTextWidth = app?.textWidth ?? 1500;
  const newTextPosX = (app?.posX ?? MIGRATION_CX) + oldTextWidth / 2 - MIGRATION_CX;
  const newTextPosY = (app?.posY ?? MIGRATION_CY) - MIGRATION_CY;

  const sig = event.signature;
  const sigSize = sig?.signatureSize ?? 300;
  const newSigPosX = (sig?.signaturePosX ?? MIGRATION_CX) + sigSize / 2 - MIGRATION_CX;
  const newSigPosY = (sig?.signaturePosY ?? MIGRATION_CY) + sigSize / 2 - MIGRATION_CY;

  const qr = event.qrCode;
  const qrSize = qr?.size ?? 130;
  const newQrPosX = qr ? qr.posX + qrSize / 2 - MIGRATION_CX : 0;
  const newQrPosY = qr ? qr.posY + qrSize / 2 - MIGRATION_CY : 0;

  return {
    ...event,
    appearance: {
      ...app,
      posX: Math.round(newTextPosX),
      posY: Math.round(newTextPosY),
      coordSystem: "center" as const,
    },
    signature: {
      ...sig,
      signaturePosX: Math.round(newSigPosX),
      signaturePosY: Math.round(newSigPosY),
    },
    qrCode: qr
      ? { ...qr, posX: Math.round(newQrPosX), posY: Math.round(newQrPosY) }
      : event.qrCode,
  };
}

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
    const raw = await this.readRaw();
    // Migra eventos legacy (coord system absoluto) para centrado
    let migrated = false;
    const all = raw.map((e) => {
      if (e.appearance?.coordSystem !== "center") {
        migrated = true;
        return migrateToCenterCoords(e);
      }
      return e;
    });
    this.cache = all;
    // Se houve migração, persiste para não re-migrar a cada leitura
    if (migrated) {
      await this.writeRaw(all);
    }
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
