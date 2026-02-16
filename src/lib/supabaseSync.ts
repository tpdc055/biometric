import { supabase, type SupabaseCitizen, type SupabaseHousehold, type SupabaseVillage, type SupabaseWard } from './supabase';
import { db, type Citizen, type Household, type Village, type Ward, getAppSetting, setAppSetting } from './db';
import { toast } from 'sonner';

export interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  isSyncing: boolean;
  pendingUploads: number;
  error: string | null;
}

export interface SyncResult {
  success: boolean;
  uploaded: {
    wards: number;
    villages: number;
    households: number;
    citizens: number;
  };
  downloaded: {
    wards: number;
    villages: number;
    households: number;
    citizens: number;
  };
  errors: string[];
}

// Get device ID
async function getDeviceId(): Promise<string> {
  let deviceId = await getAppSetting('sync_device_id');
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    await setAppSetting('sync_device_id', deviceId);
  }
  return deviceId;
}

// Helper function to upload photo to Supabase Storage
async function uploadPhotoToStorage(photoData: string, citizenId: string): Promise<string | null> {
  try {
    // Convert base64 to blob
    const response = await fetch(photoData);
    const blob = await response.blob();

    const fileName = `${citizenId}-${Date.now()}.jpg`;
    const { data, error } = await supabase.storage
      .from('citizen-photos')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('Photo upload error:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('citizen-photos')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Photo upload failed:', error);
    return null;
  }
}

// Helper function to upload fingerprint to Supabase Storage
async function uploadFingerprintToStorage(fingerprintData: string, citizenId: string): Promise<string | null> {
  try {
    // Convert base64 to blob
    const response = await fetch(fingerprintData);
    const blob = await response.blob();

    const fileName = `${citizenId}-${Date.now()}.jpg`;
    const { data, error } = await supabase.storage
      .from('citizen-fingerprints')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('Fingerprint upload error:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('citizen-fingerprints')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Fingerprint upload failed:', error);
    return null;
  }
}

// Helper function to download photo from Supabase Storage
async function downloadPhotoFromStorage(photoUrl: string): Promise<string | null> {
  try {
    const response = await fetch(photoUrl);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Photo download failed:', error);
    return null;
  }
}

// Helper function to download fingerprint from Supabase Storage
async function downloadFingerprintFromStorage(fingerprintUrl: string): Promise<string | null> {
  try {
    const response = await fetch(fingerprintUrl);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Fingerprint download failed:', error);
    return null;
  }
}

// Convert local Ward to Supabase format
function wardToSupabase(ward: Ward, existingId?: string): SupabaseWard {
  return {
    id: existingId || crypto.randomUUID(),
    code: ward.code,
    name: ward.name,
    created_at: ward.createdAt.toISOString(),
  };
}

// Convert Supabase Ward to local format
function supabaseToWard(ward: SupabaseWard): Omit<Ward, 'id'> {
  return {
    code: ward.code,
    name: ward.name,
    createdAt: new Date(ward.created_at),
  };
}

// Convert local Village to Supabase format
function villageToSupabase(village: Village, wardUuid: string, existingId?: string): SupabaseVillage {
  return {
    id: existingId || crypto.randomUUID(),
    ward_id: wardUuid,
    code: village.code,
    name: village.name,
    created_at: village.createdAt.toISOString(),
  };
}

// Convert Supabase Village to local format
function supabaseToVillage(village: SupabaseVillage, localWardId: number): Omit<Village, 'id'> {
  return {
    wardId: localWardId,
    code: village.code,
    name: village.name,
    createdAt: new Date(village.created_at),
  };
}

// Convert local Household to Supabase format
function householdToSupabase(household: Household, villageUuid: string, existingId?: string): SupabaseHousehold {
  return {
    id: existingId || crypto.randomUUID(),
    village_id: villageUuid,
    code: household.code,
    head_name: household.headName,
    location_description: household.locationDescription,
    latitude: household.latitude,
    longitude: household.longitude,
    created_at: household.createdAt.toISOString(),
    updated_at: household.updatedAt.toISOString(),
  };
}

// Convert Supabase Household to local format
function supabaseToHousehold(household: SupabaseHousehold, localVillageId: number): Omit<Household, 'id'> {
  return {
    villageId: localVillageId,
    code: household.code,
    headName: household.head_name,
    locationDescription: household.location_description,
    latitude: household.latitude,
    longitude: household.longitude,
    createdAt: new Date(household.created_at),
    updatedAt: new Date(household.updated_at),
  };
}

// Convert local Citizen to Supabase format
async function citizenToSupabase(
  citizen: Citizen,
  householdUuid: string,
  villageUuid: string,
  wardUuid: string,
  existingId?: string
): Promise<SupabaseCitizen> {
  const deviceId = await getDeviceId();

  return {
    id: existingId || crypto.randomUUID(),
    unique_id: citizen.uniqueId,
    household_id: householdUuid,
    village_id: villageUuid,
    ward_id: wardUuid,
    first_name: citizen.firstName,
    last_name: citizen.lastName,
    other_names: citizen.otherNames,
    sex: citizen.sex,
    date_of_birth: citizen.dateOfBirth?.toISOString().split('T')[0],
    age: citizen.age,
    phone_number: citizen.phoneNumber,
    occupation: citizen.occupation,
    disability_status: citizen.disabilityStatus,
    disability_notes: citizen.disabilityNotes,
    photo_url: undefined, // Photos handled separately
    fingerprint_url: undefined, // Fingerprints handled separately
    consent_given: citizen.consentGiven,
    consent_date: citizen.consentDate?.toISOString(),
    recorder_name: citizen.recorderName,
    notes: citizen.notes,
    created_at: citizen.createdAt.toISOString(),
    updated_at: citizen.updatedAt.toISOString(),
    synced_at: new Date().toISOString(),
    device_id: deviceId,
  };
}

// Convert Supabase Citizen to local format
function supabaseToCitizen(
  citizen: SupabaseCitizen,
  localHouseholdId: number,
  localVillageId: number,
  localWardId: number
): Omit<Citizen, 'id'> {
  return {
    uniqueId: citizen.unique_id,
    householdId: localHouseholdId,
    villageId: localVillageId,
    wardId: localWardId,
    firstName: citizen.first_name,
    lastName: citizen.last_name,
    otherNames: citizen.other_names,
    sex: citizen.sex,
    dateOfBirth: citizen.date_of_birth ? new Date(citizen.date_of_birth) : undefined,
    age: citizen.age,
    phoneNumber: citizen.phone_number,
    occupation: citizen.occupation,
    disabilityStatus: citizen.disability_status,
    disabilityNotes: citizen.disability_notes,
    photoData: undefined, // Photos handled separately
    fingerprintData: undefined, // Fingerprints handled separately
    consentGiven: citizen.consent_given,
    consentDate: citizen.consent_date ? new Date(citizen.consent_date) : undefined,
    recorderName: citizen.recorder_name,
    notes: citizen.notes,
    createdAt: new Date(citizen.created_at),
    updatedAt: new Date(citizen.updated_at),
  };
}

// Main sync function
export async function syncToSupabase(): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    uploaded: { wards: 0, villages: 0, households: 0, citizens: 0 },
    downloaded: { wards: 0, villages: 0, households: 0, citizens: 0 },
    errors: [],
  };

  try {
    // Check if online
    if (!navigator.onLine) {
      throw new Error('No internet connection');
    }

    // Create ID mapping
    const wardIdMap = new Map<number, string>(); // local ID -> Supabase UUID
    const villageIdMap = new Map<number, string>();
    const householdIdMap = new Map<number, string>();

    // === UPLOAD WARDS ===
    const localWards = await db.wards.toArray();
    for (const ward of localWards) {
      try {
        // Check if ward already exists in Supabase
        const { data: existing } = await supabase
          .from('wards')
          .select('id')
          .eq('code', ward.code)
          .single();

        const supabaseWard = wardToSupabase(ward, existing?.id);

        if (existing) {
          // Update
          await supabase.from('wards').update(supabaseWard).eq('id', existing.id);
        } else {
          // Insert
          await supabase.from('wards').insert(supabaseWard);
        }

        wardIdMap.set(ward.id!, supabaseWard.id);
        result.uploaded.wards++;
      } catch (error) {
        result.errors.push(`Ward ${ward.code}: ${error}`);
      }
    }

    // === UPLOAD VILLAGES ===
    const localVillages = await db.villages.toArray();
    for (const village of localVillages) {
      try {
        const wardUuid = wardIdMap.get(village.wardId);
        if (!wardUuid) {
          result.errors.push(`Village ${village.code}: Ward not found`);
          continue;
        }

        const { data: existing } = await supabase
          .from('villages')
          .select('id')
          .eq('code', village.code)
          .single();

        const supabaseVillage = villageToSupabase(village, wardUuid, existing?.id);

        if (existing) {
          await supabase.from('villages').update(supabaseVillage).eq('id', existing.id);
        } else {
          await supabase.from('villages').insert(supabaseVillage);
        }

        villageIdMap.set(village.id!, supabaseVillage.id);
        result.uploaded.villages++;
      } catch (error) {
        result.errors.push(`Village ${village.code}: ${error}`);
      }
    }

    // === UPLOAD HOUSEHOLDS ===
    const localHouseholds = await db.households.toArray();
    for (const household of localHouseholds) {
      try {
        const villageUuid = villageIdMap.get(household.villageId);
        if (!villageUuid) {
          result.errors.push(`Household ${household.code}: Village not found`);
          continue;
        }

        const { data: existing } = await supabase
          .from('households')
          .select('id')
          .eq('code', household.code)
          .single();

        const supabaseHousehold = householdToSupabase(household, villageUuid, existing?.id);

        if (existing) {
          await supabase.from('households').update(supabaseHousehold).eq('id', existing.id);
        } else {
          await supabase.from('households').insert(supabaseHousehold);
        }

        householdIdMap.set(household.id!, supabaseHousehold.id);
        result.uploaded.households++;
      } catch (error) {
        result.errors.push(`Household ${household.code}: ${error}`);
      }
    }

    // === UPLOAD CITIZENS ===
    const localCitizens = await db.citizens.toArray();
    for (const citizen of localCitizens) {
      try {
        const householdUuid = householdIdMap.get(citizen.householdId);
        const villageUuid = villageIdMap.get(citizen.villageId);
        const wardUuid = wardIdMap.get(citizen.wardId);

        if (!householdUuid || !villageUuid || !wardUuid) {
          result.errors.push(`Citizen ${citizen.uniqueId}: Missing parent records`);
          continue;
        }

        const { data: existing } = await supabase
          .from('citizens')
          .select('id')
          .eq('unique_id', citizen.uniqueId)
          .single();

        const supabaseCitizen = await citizenToSupabase(
          citizen,
          householdUuid,
          villageUuid,
          wardUuid,
          existing?.id
        );

        // Upload photo if exists
        if (citizen.photoData) {
          const photoUrl = await uploadPhotoToStorage(citizen.photoData, citizen.uniqueId);
          if (photoUrl) {
            supabaseCitizen.photo_url = photoUrl;
          }
        }

        // Upload fingerprint if exists
        if (citizen.fingerprintData) {
          const fingerprintUrl = await uploadFingerprintToStorage(citizen.fingerprintData, citizen.uniqueId);
          if (fingerprintUrl) {
            supabaseCitizen.fingerprint_url = fingerprintUrl;
          }
        }

        if (existing) {
          await supabase.from('citizens').update(supabaseCitizen).eq('id', existing.id);
        } else {
          await supabase.from('citizens').insert(supabaseCitizen);
        }

        result.uploaded.citizens++;
      } catch (error) {
        result.errors.push(`Citizen ${citizen.uniqueId}: ${error}`);
      }
    }

    // Update last sync time
    await setAppSetting('last_sync_time', new Date().toISOString());

    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    result.errors.push(`Sync failed: ${error}`);
    result.success = false;
    return result;
  }
}

// Get sync status
export async function getSyncStatus(): Promise<SyncStatus> {
  const lastSyncStr = await getAppSetting('last_sync_time');
  const lastSync = lastSyncStr ? new Date(lastSyncStr) : null;

  return {
    isOnline: navigator.onLine,
    lastSync,
    isSyncing: false,
    pendingUploads: 0,
    error: null,
  };
}

// Check connection to Supabase
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('wards').select('count', { count: 'exact', head: true });
    return !error;
  } catch {
    return false;
  }
}

// Restore data from Supabase to local database
export async function restoreFromSupabase(): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    uploaded: { wards: 0, villages: 0, households: 0, citizens: 0 },
    downloaded: { wards: 0, villages: 0, households: 0, citizens: 0 },
    errors: [],
  };

  try {
    // Check if online
    if (!navigator.onLine) {
      throw new Error('No internet connection');
    }

    // Mapping from Supabase UUIDs to local IDs
    const wardUuidToLocalId = new Map<string, number>();
    const villageUuidToLocalId = new Map<string, number>();
    const householdUuidToLocalId = new Map<string, number>();

    // === DOWNLOAD WARDS ===
    const { data: supabaseWards, error: wardsError } = await supabase
      .from('wards')
      .select('*')
      .order('created_at', { ascending: true });

    if (wardsError) {
      result.errors.push(`Failed to fetch wards: ${wardsError.message}`);
    } else if (supabaseWards) {
      for (const ward of supabaseWards) {
        try {
          // Check if exists locally by code
          const existing = await db.wards
            .where('code')
            .equals(ward.code)
            .first();

          const localWard = supabaseToWard(ward);

          let localId: number;
          if (existing) {
            await db.wards.update(existing.id!, localWard);
            localId = existing.id!;
          } else {
            const newId = await db.wards.add(localWard);
            if (newId === undefined) {
              throw new Error('Failed to add ward');
            }
            localId = newId;
          }

          wardUuidToLocalId.set(ward.id, localId);
          result.downloaded.wards++;
        } catch (error) {
          result.errors.push(`Ward ${ward.code}: ${error}`);
        }
      }
    }

    // === DOWNLOAD VILLAGES ===
    const { data: supabaseVillages, error: villagesError } = await supabase
      .from('villages')
      .select('*')
      .order('created_at', { ascending: true });

    if (villagesError) {
      result.errors.push(`Failed to fetch villages: ${villagesError.message}`);
    } else if (supabaseVillages) {
      for (const village of supabaseVillages) {
        try {
          const localWardId = wardUuidToLocalId.get(village.ward_id);
          if (!localWardId) {
            result.errors.push(`Village ${village.code}: Ward not found locally`);
            continue;
          }

          const existing = await db.villages
            .where('code')
            .equals(village.code)
            .first();

          const localVillage = supabaseToVillage(village, localWardId);

          let localId: number;
          if (existing) {
            await db.villages.update(existing.id!, localVillage);
            localId = existing.id!;
          } else {
            const newId = await db.villages.add(localVillage);
            if (newId === undefined) {
              throw new Error('Failed to add village');
            }
            localId = newId;
          }

          villageUuidToLocalId.set(village.id, localId);
          result.downloaded.villages++;
        } catch (error) {
          result.errors.push(`Village ${village.code}: ${error}`);
        }
      }
    }

    // === DOWNLOAD HOUSEHOLDS ===
    const { data: supabaseHouseholds, error: householdsError } = await supabase
      .from('households')
      .select('*')
      .order('created_at', { ascending: true });

    if (householdsError) {
      result.errors.push(`Failed to fetch households: ${householdsError.message}`);
    } else if (supabaseHouseholds) {
      for (const household of supabaseHouseholds) {
        try {
          const localVillageId = villageUuidToLocalId.get(household.village_id);
          if (!localVillageId) {
            result.errors.push(`Household ${household.code}: Village not found locally`);
            continue;
          }

          const existing = await db.households
            .where('code')
            .equals(household.code)
            .first();

          const localHousehold = supabaseToHousehold(household, localVillageId);

          let localId: number;
          if (existing) {
            await db.households.update(existing.id!, localHousehold);
            localId = existing.id!;
          } else {
            const newId = await db.households.add(localHousehold);
            if (newId === undefined) {
              throw new Error('Failed to add household');
            }
            localId = newId;
          }

          householdUuidToLocalId.set(household.id, localId);
          result.downloaded.households++;
        } catch (error) {
          result.errors.push(`Household ${household.code}: ${error}`);
        }
      }
    }

    // === DOWNLOAD CITIZENS ===
    const { data: supabaseCitizens, error: citizensError } = await supabase
      .from('citizens')
      .select('*')
      .order('created_at', { ascending: true });

    if (citizensError) {
      result.errors.push(`Failed to fetch citizens: ${citizensError.message}`);
    } else if (supabaseCitizens) {
      for (const citizen of supabaseCitizens) {
        try {
          const localHouseholdId = householdUuidToLocalId.get(citizen.household_id);
          const localVillageId = villageUuidToLocalId.get(citizen.village_id);
          const localWardId = wardUuidToLocalId.get(citizen.ward_id);

          if (!localHouseholdId || !localVillageId || !localWardId) {
            result.errors.push(`Citizen ${citizen.unique_id}: Missing parent records`);
            continue;
          }

          const existing = await db.citizens
            .where('uniqueId')
            .equals(citizen.unique_id)
            .first();

          const localCitizen = supabaseToCitizen(citizen, localHouseholdId, localVillageId, localWardId);

          // Download photo if exists
          if (citizen.photo_url) {
            const photoData = await downloadPhotoFromStorage(citizen.photo_url);
            if (photoData) {
              localCitizen.photoData = photoData;
            }
          }

          // Download fingerprint if exists
          if (citizen.fingerprint_url) {
            const fingerprintData = await downloadFingerprintFromStorage(citizen.fingerprint_url);
            if (fingerprintData) {
              localCitizen.fingerprintData = fingerprintData;
            }
          }

          if (existing) {
            await db.citizens.update(existing.id!, localCitizen);
          } else {
            await db.citizens.add(localCitizen);
          }

          result.downloaded.citizens++;
        } catch (error) {
          result.errors.push(`Citizen ${citizen.unique_id}: ${error}`);
        }
      }
    }

    // Update last sync time
    await setAppSetting('last_sync_time', new Date().toISOString());

    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    result.errors.push(`Restore failed: ${error}`);
    result.success = false;
    return result;
  }
}
