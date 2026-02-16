# Database Schema

The app uses **IndexedDB** via **Dexie.js** for local offline storage.

## Tables

### wards
| Field | Type | Description |
|-------|------|-------------|
| id | number (auto) | Primary key |
| code | string | Ward code (e.g., "W01") |
| name | string | Ward name |
| createdAt | Date | Creation timestamp |

### villages
| Field | Type | Description |
|-------|------|-------------|
| id | number (auto) | Primary key |
| wardId | number | Foreign key to wards |
| code | string | Village code (e.g., "V01") |
| name | string | Village name |
| createdAt | Date | Creation timestamp |

### households
| Field | Type | Description |
|-------|------|-------------|
| id | number (auto) | Primary key |
| villageId | number | Foreign key to villages |
| code | string | Household code (e.g., "H001") |
| headName | string | Name of household head |
| locationDescription | string? | Optional location notes |
| createdAt | Date | Creation timestamp |
| updatedAt | Date | Last update timestamp |

### citizens
| Field | Type | Description |
|-------|------|-------------|
| id | number (auto) | Primary key |
| uniqueId | string | Generated ID (WARD-VILLAGE-000001) |
| householdId | number | Foreign key to households |
| villageId | number | Foreign key to villages |
| wardId | number | Foreign key to wards |
| firstName | string | First name |
| lastName | string | Last name |
| otherNames | string? | Middle/other names |
| sex | 'male' \| 'female' | Sex |
| dateOfBirth | Date? | Exact date of birth |
| age | number? | Estimated age |
| phoneNumber | string? | Phone number |
| occupation | string? | Occupation |
| disabilityStatus | enum | none/visual/hearing/physical/intellectual/multiple/other |
| disabilityNotes | string? | Disability details |
| photoData | string? | Base64 encoded photo |
| fingerprintData | string? | Base64 encoded fingerprint |
| notes | string? | Additional notes |
| consentGiven | boolean | Consent status |
| consentDate | Date? | Consent timestamp |
| recorderName | string? | Who recorded this |
| createdAt | Date | Creation timestamp |
| updatedAt | Date | Last update timestamp |

### settings
| Field | Type | Description |
|-------|------|-------------|
| id | number (auto) | Primary key |
| key | string (unique) | Setting key |
| value | string | Setting value |

## Indexes
- wards: code, name
- villages: wardId, code, name
- households: villageId, code, headName
- citizens: uniqueId, householdId, villageId, wardId, firstName, lastName, sex
- settings: key (unique)
