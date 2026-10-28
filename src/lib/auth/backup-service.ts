// Backup service — comunicação com a VPS para upload/download de backups E2E.
// O blob é criptografado client-side (backup-crypto.ts) antes de enviar.
// A VPS nunca vê a chave derivada nem o events.json em texto.
import { API_URL } from "../events/apiConfig";
import { encryptBackup, decryptBackup, verifyChecksum } from "./backup-crypto";
import type { Evento } from "../events/types";

export interface BackupMetadata {
  id: string;
  sizeBytes: number;
  eventCount: number;
  checksum: string;
  createdAt: string;
}

export interface BackupWithBlob extends BackupMetadata {
  blob: string; // base64 (cifrado)
}

/** Faz upload de um backup criptografado dos eventos. */
export async function uploadBackup(
  token: string,
  password: string,
  kdfSalt: string,
  events: Evento[],
): Promise<BackupMetadata> {
  const { blob, checksum } = await encryptBackup(password, kdfSalt, { events, version: "1.3.0" });

  const res = await fetch(`${API_URL}/api/backups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      blob,
      eventCount: events.length,
      checksum,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Erro ${res.status} ao enviar backup`);
  }

  const data = await res.json();
  return data.backup as BackupMetadata;
}

/** Baixa o backup mais recente (cifrado) e descriptografa client-side. */
export async function downloadAndDecryptBackup(
  token: string,
  password: string,
  kdfSalt: string,
): Promise<{ events: Evento[]; metadata: BackupMetadata }> {
  const res = await fetch(`${API_URL}/api/backups/latest`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Erro ${res.status} ao baixar backup`);
  }

  const data = await res.json();
  const backup = data.backup as BackupWithBlob;

  // Verifica integridade do blob recebido
  const checksumOk = await verifyChecksum(backup.blob, backup.checksum);
  if (!checksumOk) {
    throw new Error("Checksum do backup não confere — dados corrompidos em trânsito");
  }

  // Descriptografa (lança exceção se a senha estiver errada)
  const decrypted = await decryptBackup<{ events: Evento[]; version?: string }>(
    password,
    kdfSalt,
    backup.blob,
  );

  return {
    events: Array.isArray(decrypted.events) ? decrypted.events : [],
    metadata: {
      id: backup.id,
      sizeBytes: backup.sizeBytes,
      eventCount: backup.eventCount,
      checksum: backup.checksum,
      createdAt: backup.createdAt,
    },
  };
}

/** Lista o histórico de backups (metadata apenas, sem blob). */
export async function listBackups(token: string): Promise<BackupMetadata[]> {
  const res = await fetch(`${API_URL}/api/backups`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Erro ${res.status}`);
  }
  const data = await res.json();
  return data.backups as BackupMetadata[];
}

/** Deleta um backup pelo ID. */
export async function deleteBackup(token: string, backupId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/backups/${backupId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Erro ${res.status}`);
  }
}
