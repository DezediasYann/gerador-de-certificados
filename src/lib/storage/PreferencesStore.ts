// PreferencesStore — persiste preferências do usuário.
// No Tauri, usa plugin-store (arquivo JSON local); no browser, usa localStorage.
import { isTauri } from "../tauri/TauriBridge";

export class PreferencesStore {
  private store: Map<string, unknown> = new Map();
  private tauriStore: Awaited<ReturnType<typeof import("@tauri-apps/plugin-store").load>> | null = null;
  private loaded = false;

  async init(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    if (isTauri()) {
      try {
        const { load } = await import("@tauri-apps/plugin-store");
        this.tauriStore = await load("preferences.json", { autoSave: true });
      } catch (err) {
        console.warn("Tauri store indisponível, usando localStorage:", err);
      }
    }
  }

  async get<T>(key: string, fallback: T): Promise<T> {
    await this.init();
    if (this.tauriStore) {
      const v = await this.tauriStore.get<T>(key);
      return v ?? fallback;
    }
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(`geradorcert_${key}`);
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.init();
    if (this.tauriStore) {
      await this.tauriStore.set(key, value);
      return;
    }
    if (typeof window === "undefined") return;
    window.localStorage.setItem(`geradorcert_${key}`, JSON.stringify(value));
  }
}
