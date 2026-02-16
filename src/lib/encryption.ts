/**
 * Encryption utilities for sensitive data at rest
 * Uses Web Crypto API for AES-GCM encryption
 */

const ENCRYPTION_ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const ITERATIONS = 100000;

// Generate a random salt
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

// Generate a random IV
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

// Derive a key from a password using PBKDF2
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

// Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

// Convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  salt: string;
  version: number;
}

/**
 * Encrypt data with a password
 */
export async function encryptData(data: string, password: string): Promise<EncryptedData> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  const salt = generateSalt();
  const iv = generateIV();
  const key = await deriveKey(password, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    key,
    dataBuffer
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer),
    salt: arrayBufferToBase64(salt.buffer),
    version: 1,
  };
}

/**
 * Decrypt data with a password
 */
export async function decryptData(encryptedData: EncryptedData, password: string): Promise<string> {
  const ciphertext = base64ToArrayBuffer(encryptedData.ciphertext);
  const iv = new Uint8Array(base64ToArrayBuffer(encryptedData.iv));
  const salt = new Uint8Array(base64ToArrayBuffer(encryptedData.salt));

  const key = await deriveKey(password, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Encrypt an object
 */
export async function encryptObject<T>(obj: T, password: string): Promise<EncryptedData> {
  const jsonString = JSON.stringify(obj);
  return encryptData(jsonString, password);
}

/**
 * Decrypt an object
 */
export async function decryptObject<T>(encryptedData: EncryptedData, password: string): Promise<T> {
  const jsonString = await decryptData(encryptedData, password);
  return JSON.parse(jsonString) as T;
}

/**
 * Generate a secure random encryption key (for auto-generated keys)
 */
export function generateEncryptionKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return arrayBufferToBase64(bytes.buffer);
}

/**
 * Hash a value (for storing encrypted data references)
 */
export async function hashValue(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return arrayBufferToBase64(hashBuffer);
}

/**
 * Check if encryption is supported
 */
export function isEncryptionSupported(): boolean {
  return typeof crypto !== "undefined" &&
         typeof crypto.subtle !== "undefined" &&
         typeof crypto.subtle.encrypt === "function";
}

/**
 * Sensitive fields that should be encrypted
 */
export const SENSITIVE_FIELDS = [
  "photoData",
  "fingerprintData",
  "phoneNumber",
  "notes",
  "disabilityNotes",
  "locationDescription",
] as const;

export type SensitiveField = typeof SENSITIVE_FIELDS[number];

/**
 * Encrypt sensitive fields in a citizen object
 */
export async function encryptSensitiveFields<T extends Record<string, unknown>>(
  data: T,
  password: string,
  fields: readonly string[] = SENSITIVE_FIELDS
): Promise<T & { __encrypted?: string[] }> {
  const result = { ...data } as T & { __encrypted?: string[] };
  const encryptedFields: string[] = [];

  for (const field of fields) {
    if (field in data && data[field]) {
      const value = data[field];
      if (typeof value === "string") {
        const encrypted = await encryptData(value, password);
        (result as Record<string, unknown>)[field] = JSON.stringify(encrypted);
        encryptedFields.push(field);
      }
    }
  }

  if (encryptedFields.length > 0) {
    result.__encrypted = encryptedFields;
  }

  return result;
}

/**
 * Decrypt sensitive fields in a citizen object
 */
export async function decryptSensitiveFields<T extends Record<string, unknown>>(
  data: T & { __encrypted?: string[] },
  password: string
): Promise<T> {
  const result = { ...data } as T;
  const encryptedFields = data.__encrypted || [];

  for (const field of encryptedFields) {
    if (field in data && data[field]) {
      try {
        const encryptedData = JSON.parse(data[field] as string) as EncryptedData;
        const decrypted = await decryptData(encryptedData, password);
        (result as Record<string, unknown>)[field] = decrypted;
      } catch (error) {
        console.error(`Failed to decrypt field ${field}:`, error);
      }
    }
  }

  // Remove the __encrypted marker
  delete (result as Record<string, unknown>).__encrypted;

  return result;
}
