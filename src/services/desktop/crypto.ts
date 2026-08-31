export interface EncryptedValue {
  iv: string;
  data: string;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const PBKDF2_ITERATIONS = 600_000;
let activeKey: CryptoKey | null = null;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function randomBase64(size = 16): string {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return bytesToBase64(bytes);
}

export async function deriveWorkspaceKey(pin: string, salt: string): Promise<CryptoKey> {
  const normalized = pin.trim();
  if (normalized.length < 4) throw new Error("PIN must contain at least 4 characters.");

  const material = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(normalized),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: base64ToBytes(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function setActiveWorkspaceKey(key: CryptoKey | null) {
  activeKey = key;
}

export function requireActiveWorkspaceKey(): CryptoKey {
  if (!activeKey) throw new Error("Workspace is locked.");
  return activeKey;
}

export async function encryptBytes(bytes: ArrayBuffer | Uint8Array, key = requireActiveWorkspaceKey()): Promise<EncryptedValue> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes);
  return { iv: bytesToBase64(iv), data: bytesToBase64(new Uint8Array(encrypted)) };
}

export async function decryptBytes(value: EncryptedValue, key = requireActiveWorkspaceKey()): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(value.iv) },
    key,
    base64ToBytes(value.data),
  );
}

export async function encryptJson(value: unknown, key = requireActiveWorkspaceKey()): Promise<EncryptedValue> {
  return encryptBytes(textEncoder.encode(JSON.stringify(value)), key);
}

export async function decryptJson<T>(value: EncryptedValue, key = requireActiveWorkspaceKey()): Promise<T> {
  return JSON.parse(textDecoder.decode(await decryptBytes(value, key))) as T;
}

export { base64ToBytes, bytesToBase64, PBKDF2_ITERATIONS };
