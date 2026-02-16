import { type Citizen, db } from "./db";

export interface ValidationError {
  field: string;
  message: string;
  row?: number;
}

export interface DuplicateMatch {
  citizen: Citizen;
  matchScore: number;
  matchReasons: string[];
}

// Validation rules for citizen data
export function validateCitizenData(data: Partial<Citizen>, rowNumber?: number): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required fields
  if (!data.firstName?.trim()) {
    errors.push({ field: "firstName", message: "First name is required", row: rowNumber });
  }
  if (!data.lastName?.trim()) {
    errors.push({ field: "lastName", message: "Last name is required", row: rowNumber });
  }
  if (!data.sex || !["male", "female"].includes(data.sex)) {
    errors.push({ field: "sex", message: "Sex must be 'male' or 'female'", row: rowNumber });
  }

  // Phone number validation (if provided)
  if (data.phoneNumber) {
    const phoneRegex = /^[\d\s\-+()]{7,15}$/;
    if (!phoneRegex.test(data.phoneNumber)) {
      errors.push({ field: "phoneNumber", message: "Invalid phone number format", row: rowNumber });
    }
  }

  // Age validation
  if (data.age !== undefined && data.age !== null) {
    if (data.age < 0 || data.age > 150) {
      errors.push({ field: "age", message: "Age must be between 0 and 150", row: rowNumber });
    }
  }

  // Date of birth validation
  if (data.dateOfBirth) {
    const dob = new Date(data.dateOfBirth);
    const now = new Date();
    if (dob > now) {
      errors.push({ field: "dateOfBirth", message: "Date of birth cannot be in the future", row: rowNumber });
    }
  }

  // Disability status validation
  const validDisabilityStatuses = ["none", "visual", "hearing", "physical", "intellectual", "multiple", "other"];
  if (data.disabilityStatus && !validDisabilityStatuses.includes(data.disabilityStatus)) {
    errors.push({ field: "disabilityStatus", message: "Invalid disability status", row: rowNumber });
  }

  return errors;
}

// Calculate similarity between two strings (Levenshtein distance based)
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matrix: number[][] = [];

  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const maxLen = Math.max(s1.length, s2.length);
  return 1 - matrix[s1.length][s2.length] / maxLen;
}

// Check for duplicate citizens
export async function findDuplicates(
  newCitizen: Partial<Citizen>,
  threshold = 0.7
): Promise<DuplicateMatch[]> {
  const existingCitizens = await db.citizens.toArray();
  const duplicates: DuplicateMatch[] = [];

  for (const existing of existingCitizens) {
    const matchReasons: string[] = [];
    let totalScore = 0;
    let scoreCount = 0;

    // Check name similarity
    if (newCitizen.firstName && existing.firstName) {
      const firstNameSim = stringSimilarity(newCitizen.firstName, existing.firstName);
      if (firstNameSim > 0.8) {
        matchReasons.push(`First name similar (${Math.round(firstNameSim * 100)}%)`);
        totalScore += firstNameSim;
        scoreCount++;
      }
    }

    if (newCitizen.lastName && existing.lastName) {
      const lastNameSim = stringSimilarity(newCitizen.lastName, existing.lastName);
      if (lastNameSim > 0.8) {
        matchReasons.push(`Last name similar (${Math.round(lastNameSim * 100)}%)`);
        totalScore += lastNameSim;
        scoreCount++;
      }
    }

    // Check exact phone match
    if (newCitizen.phoneNumber && existing.phoneNumber) {
      const cleanNew = newCitizen.phoneNumber.replace(/\D/g, "");
      const cleanExisting = existing.phoneNumber.replace(/\D/g, "");
      if (cleanNew === cleanExisting && cleanNew.length > 0) {
        matchReasons.push("Same phone number");
        totalScore += 1;
        scoreCount++;
      }
    }

    // Check date of birth match
    if (newCitizen.dateOfBirth && existing.dateOfBirth) {
      const newDob = new Date(newCitizen.dateOfBirth).toDateString();
      const existingDob = new Date(existing.dateOfBirth).toDateString();
      if (newDob === existingDob) {
        matchReasons.push("Same date of birth");
        totalScore += 1;
        scoreCount++;
      }
    }

    // Check same household
    if (newCitizen.householdId && existing.householdId && newCitizen.householdId === existing.householdId) {
      matchReasons.push("Same household");
      totalScore += 0.5;
      scoreCount++;
    }

    // Check same village
    if (newCitizen.villageId && existing.villageId && newCitizen.villageId === existing.villageId) {
      matchReasons.push("Same village");
      totalScore += 0.3;
      scoreCount++;
    }

    if (scoreCount > 0) {
      const matchScore = totalScore / scoreCount;
      if (matchScore >= threshold && matchReasons.length >= 2) {
        duplicates.push({
          citizen: existing,
          matchScore,
          matchReasons,
        });
      }
    }
  }

  // Sort by match score descending
  return duplicates.sort((a, b) => b.matchScore - a.matchScore);
}

// Batch validation for CSV import
export async function validateImportBatch(
  records: Partial<Citizen>[],
  options: { skipDuplicateCheck?: boolean } = {}
): Promise<{
  valid: Partial<Citizen>[];
  errors: ValidationError[];
  duplicates: { row: number; matches: DuplicateMatch[] }[];
}> {
  const valid: Partial<Citizen>[] = [];
  const errors: ValidationError[] = [];
  const duplicates: { row: number; matches: DuplicateMatch[] }[] = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const rowNumber = i + 1;

    // Validate the record
    const validationErrors = validateCitizenData(record, rowNumber);
    if (validationErrors.length > 0) {
      errors.push(...validationErrors);
      continue;
    }

    // Check for duplicates
    if (!options.skipDuplicateCheck) {
      const matches = await findDuplicates(record);
      if (matches.length > 0) {
        duplicates.push({ row: rowNumber, matches });
      }
    }

    valid.push(record);
  }

  return { valid, errors, duplicates };
}

// Clean and normalize citizen data
export function normalizeCitizenData(data: Record<string, string>): Partial<Citizen> {
  const normalized: Partial<Citizen> = {};

  // Map common CSV column names to our schema
  const columnMappings: Record<string, keyof Citizen> = {
    "first name": "firstName",
    "firstname": "firstName",
    "first_name": "firstName",
    "last name": "lastName",
    "lastname": "lastName",
    "last_name": "lastName",
    "other names": "otherNames",
    "othernames": "otherNames",
    "other_names": "otherNames",
    "middle name": "otherNames",
    "sex": "sex",
    "gender": "sex",
    "date of birth": "dateOfBirth",
    "dateofbirth": "dateOfBirth",
    "date_of_birth": "dateOfBirth",
    "dob": "dateOfBirth",
    "birth date": "dateOfBirth",
    "age": "age",
    "phone": "phoneNumber",
    "phone number": "phoneNumber",
    "phonenumber": "phoneNumber",
    "phone_number": "phoneNumber",
    "mobile": "phoneNumber",
    "telephone": "phoneNumber",
    "occupation": "occupation",
    "job": "occupation",
    "work": "occupation",
    "disability": "disabilityStatus",
    "disability status": "disabilityStatus",
    "disability_status": "disabilityStatus",
    "notes": "notes",
    "comments": "notes",
    "remarks": "notes",
  };

  for (const [key, value] of Object.entries(data)) {
    const normalizedKey = key.toLowerCase().trim();
    const mappedKey = columnMappings[normalizedKey] || normalizedKey;

    if (mappedKey === "firstName" || mappedKey === "lastName" || mappedKey === "otherNames") {
      normalized[mappedKey] = value?.trim() || undefined;
    } else if (mappedKey === "sex") {
      const sexValue = value?.toLowerCase().trim();
      if (sexValue === "m" || sexValue === "male") {
        normalized.sex = "male";
      } else if (sexValue === "f" || sexValue === "female") {
        normalized.sex = "female";
      }
    } else if (mappedKey === "age") {
      const ageNum = Number.parseInt(value, 10);
      if (!Number.isNaN(ageNum)) {
        normalized.age = ageNum;
      }
    } else if (mappedKey === "dateOfBirth") {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        normalized.dateOfBirth = date;
      }
    } else if (mappedKey === "phoneNumber") {
      normalized.phoneNumber = value?.trim() || undefined;
    } else if (mappedKey === "occupation") {
      normalized.occupation = value?.trim() || undefined;
    } else if (mappedKey === "disabilityStatus") {
      const status = value?.toLowerCase().trim();
      const validStatuses = ["none", "visual", "hearing", "physical", "intellectual", "multiple", "other"];
      if (validStatuses.includes(status)) {
        normalized.disabilityStatus = status as Citizen["disabilityStatus"];
      } else {
        normalized.disabilityStatus = "none";
      }
    } else if (mappedKey === "notes") {
      normalized.notes = value?.trim() || undefined;
    }
  }

  return normalized;
}
