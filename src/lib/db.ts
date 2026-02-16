import Dexie, { type EntityTable } from "dexie";

// Types
export interface Ward {
  id?: number;
  code: string;
  name: string;
  createdAt: Date;
}

export interface Village {
  id?: number;
  wardId: number;
  code: string;
  name: string;
  createdAt: Date;
}

export interface Household {
  id?: number;
  villageId: number;
  code: string;
  headName: string;
  locationDescription?: string;
  latitude?: number;
  longitude?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Citizen {
  id?: number;
  uniqueId: string; // e.g., WARD-VILLAGE-000123
  householdId: number;
  villageId: number;
  wardId: number;

  // Personal Info
  firstName: string;
  lastName: string;
  otherNames?: string;
  sex: "male" | "female";
  dateOfBirth?: Date;
  age?: number;
  phoneNumber?: string;

  // Classification
  occupation?: string;
  disabilityStatus:
    | "none"
    | "visual"
    | "hearing"
    | "physical"
    | "intellectual"
    | "multiple"
    | "other";
  disabilityNotes?: string;

  // Photos
  photoData?: string; // Base64 encoded
  fingerprintData?: string; // Base64 encoded fingerprint image

  // Notes
  notes?: string;

  // Consent
  consentGiven: boolean;
  consentDate?: Date;
  recorderName?: string;

  // Meta
  createdAt: Date;
  updatedAt: Date;
}

export interface AppSettings {
  id?: number;
  key: string;
  value: string;
}

// Database class
class CitizenRegistryDB extends Dexie {
  wards!: EntityTable<Ward, "id">;
  villages!: EntityTable<Village, "id">;
  households!: EntityTable<Household, "id">;
  citizens!: EntityTable<Citizen, "id">;
  settings!: EntityTable<AppSettings, "id">;

  constructor() {
    super("CitizenRegistryDB");

    this.version(1).stores({
      wards: "++id, code, name",
      villages: "++id, wardId, code, name",
      households: "++id, villageId, code, headName",
      citizens:
        "++id, uniqueId, householdId, villageId, wardId, firstName, lastName, sex",
      settings: "++id, &key",
    });
  }
}

export const db = new CitizenRegistryDB();

// Helper functions
export async function generateCitizenId(
  wardCode: string,
  villageCode: string,
): Promise<string> {
  const count = await db.citizens.count();
  const paddedNumber = String(count + 1).padStart(6, "0");
  return `${wardCode}-${villageCode}-${paddedNumber}`;
}

export async function getAppSetting(key: string): Promise<string | null> {
  const setting = await db.settings.where("key").equals(key).first();
  return setting?.value ?? null;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  const existing = await db.settings.where("key").equals(key).first();
  if (existing) {
    await db.settings.update(existing.id!, { value });
  } else {
    await db.settings.add({ key, value });
  }
}

// PIN management (stored hashed)
export async function setPIN(pin: string): Promise<void> {
  // Simple hash for demo - in production use proper crypto
  const encoder = new TextEncoder();
  const data = encoder.encode(`${pin}citizen-registry-salt`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  await setAppSetting("pin_hash", hashHex);
}

export async function verifyPIN(pin: string): Promise<boolean> {
  const storedHash = await getAppSetting("pin_hash");
  if (!storedHash) return false;

  const encoder = new TextEncoder();
  const data = encoder.encode(`${pin}citizen-registry-salt`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashHex === storedHash;
}

export async function hasPIN(): Promise<boolean> {
  const hash = await getAppSetting("pin_hash");
  return hash !== null;
}
