// Backup crypto — criptografia ponta-a-ponta (E2E) para backup de eventos.
// Usa Web Crypto API (SubtleCrypto) disponível nativamente no browser e no Tauri WebView.
//
// Fluxo:
//   1. Na criação de conta, o cliente gera um salt aleatório (32 bytes)
//   2. O cliente deriva uma chave AES-256 via PBKDF2(password, salt, 150000 iterações)
//   3. O cliente criptografa events.json com AES-GCM (IV aleatório por backup)
//   4. O blob criptografado é enviado à VPS, que NUNCA vê a chave derivada
//   5. Na restauração, o cliente baixa o blob, deriva a chave novamente (com o salt
//      que veio do servidor junto com o user), e descriptografa
//
// A VPS armazena: bcrypt(password) para auth + kdf_salt (público) + blob cifrado.
// Mesmo se a VPS for comprometida, os backups são inúteis sem a senha do usuário.

const PBKDF2_ITERATIONS = 150_000;
const KEY_LENGTH_BITS = 256; // AES-256
const SALT_LENGTH = 32; // bytes
const IV_LENGTH = 12; // bytes (AES-GCM padrão)

/** Gera um salt aleatório em base64 (para enviar ao servidor no registro). */
export function generateKdfSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return uint8ArrayToBase64(salt);
}

/** Deriva uma chave AES-256 a partir de senha + salt (base64) via PBKDF2. */
async function deriveKey(password: string, saltBase64: string): Promise<CryptoKey> {
  const salt = base64ToUint8Array(saltBase64);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH_BITS },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Criptografa um payload JSON (events.json) com AES-GCM.
 * @param password  senha do usuário (nunca enviada ao servidor em texto — só via HTTPS para auth)
 * @param saltBase64  salt em base64 (armazenado no servidor, retornado no login)
 * @param data  objeto que será JSON.stringified e cifrado
 * @returns { blob: base64, checksum: sha256hex } — prontos para enviar ao servidor
 */
export async function encryptBackup(
  password: string,
  saltBase64: string,
  data: unknown,
): Promise<{ blob: string; checksum: string }> {
  const key = await deriveKey(password, saltBase64);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    plaintext as BufferSource,
  );

  // Concatena IV + ciphertext (IV é público, necessário para descriptografar)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  const blob = uint8ArrayToBase64(combined);
  const checksum = await sha256Hex(combined);
  return { blob, checksum };
}

/**
 * Descriptografa um blob (base64) retornado pelo servidor.
 * @param password  senha do usuário
 * @param saltBase64  salt em base64 (do perfil do usuário)
 * @param blobBase64  blob cifrado em base64 (IV + ciphertext)
 * @returns o objeto JSON descriptografado
 * @throws se a senha estiver errada ou o blob estiver corrompido
 */
export async function decryptBackup<T = unknown>(
  password: string,
  saltBase64: string,
  blobBase64: string,
): Promise<T> {
  const key = await deriveKey(password, saltBase64);
  const combined = base64ToUint8Array(blobBase64);

  // Extrai IV (primeiros 12 bytes) + ciphertext (resto)
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    ciphertext as BufferSource,
  );

  const json = new TextDecoder().decode(plaintext);
  return JSON.parse(json) as T;
}

/** Verifica se um checksum SHA-256 (hex) confere com o blob (base64). */
export async function verifyChecksum(blobBase64: string, expectedChecksumHex: string): Promise<boolean> {
  const actual = await sha256Hex(base64ToUint8Array(blobBase64));
  return actual.toLowerCase() === expectedChecksumHex.toLowerCase();
}

// ━━ Helpers base64 ━━

function uint8ArrayToBase64(arr: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return arr;
}

async function sha256Hex(arr: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", arr as BufferSource);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
