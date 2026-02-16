import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://agreoumeyvjebhpzxpjf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFncmVvdW1leXZqZWJocHp4cGpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNjE1MDcsImV4cCI6MjA4NjgzNzUwN30.TPkdK0ezAbcuuBzW3XQsLcjYJVJtDzyQnujZ5-rtKl8';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-mpg-app': 'citizen-registry',
    },
  },
});

// Database Types for TypeScript
export interface SupabaseWard {
  id: string;
  code: string;
  name: string;
  created_at: string;
  updated_at?: string;
}

export interface SupabaseVillage {
  id: string;
  ward_id: string;
  code: string;
  name: string;
  created_at: string;
  updated_at?: string;
}

export interface SupabaseHousehold {
  id: string;
  village_id: string;
  code: string;
  head_name: string;
  location_description?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

export interface SupabaseCitizen {
  id: string;
  unique_id: string;
  household_id: string;
  village_id: string;
  ward_id: string;

  // Personal Info
  first_name: string;
  last_name: string;
  other_names?: string;
  sex: 'male' | 'female';
  date_of_birth?: string;
  age?: number;
  phone_number?: string;

  // Classification
  occupation?: string;
  disability_status: 'none' | 'visual' | 'hearing' | 'physical' | 'intellectual' | 'multiple' | 'other';
  disability_notes?: string;

  // Media (URLs to Supabase Storage)
  photo_url?: string;
  fingerprint_url?: string;

  // Consent
  consent_given: boolean;
  consent_date?: string;
  recorder_name?: string;

  notes?: string;

  // Metadata
  created_at: string;
  updated_at: string;
  synced_at?: string;
  device_id?: string;
}

// Check if Supabase is configured and reachable
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('wards').select('count', { count: 'exact', head: true });
    return !error;
  } catch {
    return false;
  }
}
