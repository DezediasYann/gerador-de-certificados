// User auth store — gerencia autenticação do usuário do app desktop.
// Persiste token + user em PreferencesStore (Tauri Store / localStorage).
// A senha NÃO é persistida — fica só em memória durante a sessão
// (necessária para decriptografar backups E2E).
import { create } from "zustand";
import { API_URL } from "../lib/events/apiConfig";
import { PreferencesStore } from "../lib/storage/PreferencesStore";
import { generateKdfSalt } from "../lib/auth/backup-crypto";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  kdfSalt: string;
  createdAt: string;
  lastLoginAt: string | null;
}

interface UserAuthState {
  user: AuthUser | null;
  token: string | null;
  /** Senha em memória (NÃO persistida) — necessária para backup E2E. */
  password: string | null;
  /** Access key associada ao user (se o admin criou uma). Auto-preenchida no campo de validação. */
  accessKey: string | null;
  accessKeyIssuer: string | null;
  loading: boolean;
  error: string | null;

  register: (email: string, password: string, name: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  fetchAccessKey: () => Promise<void>;
  forgotPassword: (email: string) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  clearError: () => void;
}

const prefs = new PreferencesStore();

export const useUserAuth = create<UserAuthState>((set, get) => ({
  user: null,
  token: null,
  password: null,
  accessKey: null,
  accessKeyIssuer: null,
  loading: false,
  error: null,

  register: async (email, password, name) => {
    set({ loading: true, error: null });
    try {
      const kdfSalt = generateKdfSalt();
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, kdfSalt }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        set({ loading: false, error: data.error || "Erro ao criar conta" });
        return false;
      }
      const user = data.user as AuthUser;
      const token = data.token as string;
      // Persiste token + user (NÃO a senha)
      await prefs.set("auth_token", token);
      await prefs.set("auth_user", user);
      set({ user, token, password, loading: false });
      // Busca access key associada (provavelmente ainda não tem — admin precisa criar)
      void get().fetchAccessKey();
      return true;
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : "Erro de rede" });
      return false;
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        set({ loading: false, error: data.error || "Credenciais inválidas" });
        return false;
      }
      const user = data.user as AuthUser;
      const token = data.token as string;
      await prefs.set("auth_token", token);
      await prefs.set("auth_user", user);
      set({ user, token, password, loading: false });
      // Pós-login: busca chave associada; se user tem manual key no config, tenta claim
      void get().fetchAccessKey();
      return true;
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : "Erro de rede" });
      return false;
    }
  },

  logout: async () => {
    await prefs.set("auth_token", null);
    await prefs.set("auth_user", null);
    set({ user: null, token: null, password: null, accessKey: null, accessKeyIssuer: null, error: null });
  },

  restoreSession: async () => {
    const token = await prefs.get<string | null>("auth_token", null);
    const user = await prefs.get<AuthUser | null>("auth_user", null);
    if (!token || !user) {
      set({ user: null, token: null });
      return;
    }
    // Valida o token no servidor (pode estar expirado)
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          set({ user: data.user, token });
          // Busca access key associada
          void get().fetchAccessKey();
          return;
        }
      }
      // Token inválido — limpa
      await prefs.set("auth_token", null);
      await prefs.set("auth_user", null);
      set({ user: null, token: null });
    } catch {
      // Erro de rede — mantém sessão (offline mode)
      set({ user, token });
    }
  },

  fetchAccessKey: async () => {
    const { token } = get();
    if (!token) return;
    try {
      // 1. Busca chave associada ao user (se já existe)
      const res = await fetch(`${API_URL}/api/auth/my-access-key`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const { useEventStore } = await import("./event-store");

      if (data.ok && data.hasKey) {
        // User TEM chave associada via email → ela anula qualquer manual
        set({ accessKey: data.accessKey, accessKeyIssuer: data.issuer });
        useEventStore.getState().setApiConfig({ accessKey: data.accessKey });
        return;
      }
      // 2. User NÃO tem chave via email → tenta claim da manual (se existir)
      const manualKey = useEventStore.getState().apiConfig.accessKey;
      if (manualKey && manualKey.startsWith("gdc_")) {
        try {
          const claimRes = await fetch(`${API_URL}/api/auth/claim-access-key`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ accessKey: manualKey }),
          });
          const claimData = await claimRes.json();
          if (claimData.ok) {
            // Claim OK — key agora associada permanentemente
            set({ accessKey: claimData.accessKey, accessKeyIssuer: claimData.issuer });
            // apiConfig já tem a key (foi ela que claim usou), mantém
          } else {
            // Claim falhou — key não existe, está revogada, ou pertence a outro user.
            // Limpa a manual para não confundir.
            set({ accessKey: null, accessKeyIssuer: null });
            useEventStore.getState().setApiConfig({ accessKey: "" });
          }
        } catch {
          // Erro de rede no claim — ignora, mantém manual
        }
      } else {
        set({ accessKey: null, accessKeyIssuer: null });
      }
    } catch {
      // offline — ignora
    }
  },

  clearError: () => set({ error: null }),

  forgotPassword: async (email) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        set({ loading: false, error: data.error || "Erro ao solicitar reset" });
        return false;
      }
      set({ loading: false });
      return true;
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : "Erro de rede" });
      return false;
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    const { token } = get();
    if (!token) {
      set({ error: "Não autenticado" });
      return false;
    }
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        set({ loading: false, error: data.error || "Erro ao trocar senha" });
        return false;
      }
      set({ loading: false });
      return true;
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : "Erro de rede" });
      return false;
    }
  },
}));
