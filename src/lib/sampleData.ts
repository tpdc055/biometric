import { db, generateCitizenId } from './db';

const SAMPLE_WARDS = [
  { code: 'W01', name: 'Mwanakwerekwe' },
  { code: 'W02', name: 'Kiembe Samaki' },
];

const SAMPLE_VILLAGES = [
  { wardCode: 'W01', villages: [
    { code: 'V01', name: 'Kisauni' },
    { code: 'V02', name: 'Mwembe Ladu' },
  ]},
  { wardCode: 'W02', villages: [
    { code: 'V01', name: 'Mpendae' },
    { code: 'V02', name: 'Kilimani' },
  ]},
];

const SAMPLE_FIRST_NAMES = ['Juma', 'Fatima', 'Hassan', 'Amina', 'Said', 'Mwanaisha', 'Ali', 'Zaina', 'Mohamed', 'Halima'];
const SAMPLE_LAST_NAMES = ['Abdallah', 'Omar', 'Bakari', 'Salim', 'Rashid', 'Mwalimu', 'Hamad', 'Yusuf', 'Khamis', 'Seif'];
const SAMPLE_OCCUPATIONS = ['Farmer', 'Fisherman', 'Teacher', 'Trader/Business', 'Student', 'Health Worker'];

export async function loadSampleData(): Promise<{ success: boolean; message: string }> {
  try {
    // Check if data already exists
    const existingWards = await db.wards.count();
    if (existingWards > 0) {
      return { success: false, message: 'Sample data already loaded. Clear existing data first.' };
    }

    const now = new Date();
    const wardIdMap: Record<string, number> = {};
    const villageIdMap: Record<string, number> = {};
    const householdIds: number[] = [];

    // Create wards
    for (const ward of SAMPLE_WARDS) {
      const id = await db.wards.add({
        code: ward.code,
        name: ward.name,
        createdAt: now,
      });
      if (id !== undefined) {
        wardIdMap[ward.code] = id;
      }
    }

    // Create villages
    for (const wardVillages of SAMPLE_VILLAGES) {
      const wardId = wardIdMap[wardVillages.wardCode];
      if (!wardId) continue;
      for (const village of wardVillages.villages) {
        const id = await db.villages.add({
          wardId,
          code: village.code,
          name: village.name,
          createdAt: now,
        });
        if (id !== undefined) {
          villageIdMap[`${wardVillages.wardCode}-${village.code}`] = id;
        }
      }
    }

    // Create households (2 per village)
    const householdHeads = [
      'Mzee Bakari', 'Bi Fatuma', 'Bwana Hassan', 'Mama Zainab',
      'Mzee Salim', 'Bi Mwanaisha', 'Bwana Ali', 'Mama Halima'
    ];
    let householdIndex = 0;

    for (const wardVillages of SAMPLE_VILLAGES) {
      for (const village of wardVillages.villages) {
        const villageId = villageIdMap[`${wardVillages.wardCode}-${village.code}`];

        for (let i = 0; i < 2; i++) {
          const id = await db.households.add({
            villageId,
            code: `H${String(i + 1).padStart(3, '0')}`,
            headName: householdHeads[householdIndex % householdHeads.length],
            locationDescription: `Near ${village.name} center, House ${i + 1}`,
            createdAt: now,
            updatedAt: now,
          });
          if (id !== undefined) {
            householdIds.push(id);
          }
          householdIndex++;
        }
      }
    }

    // Create citizens (2-3 per household)
    for (const householdId of householdIds) {
      const household = await db.households.get(householdId);
      if (!household) continue;

      const village = await db.villages.get(household.villageId);
      if (!village) continue;

      const ward = await db.wards.get(village.wardId);
      if (!ward) continue;

      const memberCount = 2 + Math.floor(Math.random() * 2); // 2-3 members

      for (let i = 0; i < memberCount; i++) {
        const isMale = Math.random() > 0.5;
        const firstName = SAMPLE_FIRST_NAMES[Math.floor(Math.random() * SAMPLE_FIRST_NAMES.length)];
        const lastName = SAMPLE_LAST_NAMES[Math.floor(Math.random() * SAMPLE_LAST_NAMES.length)];
        const age = 18 + Math.floor(Math.random() * 60); // 18-77 years
        const occupation = SAMPLE_OCCUPATIONS[Math.floor(Math.random() * SAMPLE_OCCUPATIONS.length)];

        const uniqueId = await generateCitizenId(ward.code, village.code);

        await db.citizens.add({
          uniqueId,
          householdId,
          villageId: village.id!,
          wardId: ward.id!,
          firstName,
          lastName,
          sex: isMale ? 'male' : 'female',
          age,
          occupation,
          disabilityStatus: Math.random() > 0.9 ? 'physical' : 'none',
          consentGiven: true,
          consentDate: now,
          recorderName: 'Sample Data',
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Set recorder name
    await db.settings.add({ key: 'recorder_name', value: 'Field Officer' });

    const totalCitizens = await db.citizens.count();
    return {
      success: true,
      message: `Sample data loaded: 2 wards, 4 villages, 8 households, ${totalCitizens} citizens`
    };
  } catch (error) {
    console.error('Error loading sample data:', error);
    return { success: false, message: 'Failed to load sample data' };
  }
}

export async function clearAllData(): Promise<void> {
  await db.citizens.clear();
  await db.households.clear();
  await db.villages.clear();
  await db.wards.clear();
  // Keep settings (PIN, etc.)
}
