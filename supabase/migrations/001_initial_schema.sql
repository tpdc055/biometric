-- =====================================================
-- Madang Provincial Government - Citizen Registry
-- Supabase Database Schema
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

-- Wards Table
CREATE TABLE IF NOT EXISTS wards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Villages Table
CREATE TABLE IF NOT EXISTS villages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Households Table
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  village_id UUID NOT NULL REFERENCES villages(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  head_name TEXT NOT NULL,
  location_description TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Citizens Table
CREATE TABLE IF NOT EXISTS citizens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unique_id TEXT UNIQUE NOT NULL,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  village_id UUID NOT NULL REFERENCES villages(id) ON DELETE CASCADE,
  ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE CASCADE,

  -- Personal Information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  other_names TEXT,
  sex TEXT NOT NULL CHECK (sex IN ('male', 'female')),
  date_of_birth DATE,
  age INTEGER CHECK (age >= 0 AND age <= 150),
  phone_number TEXT,

  -- Classification
  occupation TEXT,
  disability_status TEXT NOT NULL DEFAULT 'none'
    CHECK (disability_status IN ('none', 'visual', 'hearing', 'physical', 'intellectual', 'multiple', 'other')),
  disability_notes TEXT,

  -- Media (URLs to Supabase Storage)
  photo_url TEXT,
  fingerprint_url TEXT,

  -- Consent
  consent_given BOOLEAN NOT NULL DEFAULT FALSE,
  consent_date TIMESTAMPTZ,
  recorder_name TEXT,

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  device_id TEXT
);

-- =====================================================
-- INDEXES for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_villages_ward_id ON villages(ward_id);
CREATE INDEX IF NOT EXISTS idx_households_village_id ON households(village_id);
CREATE INDEX IF NOT EXISTS idx_citizens_household_id ON citizens(household_id);
CREATE INDEX IF NOT EXISTS idx_citizens_village_id ON citizens(village_id);
CREATE INDEX IF NOT EXISTS idx_citizens_ward_id ON citizens(ward_id);
CREATE INDEX IF NOT EXISTS idx_citizens_unique_id ON citizens(unique_id);
CREATE INDEX IF NOT EXISTS idx_citizens_names ON citizens(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_citizens_sex ON citizens(sex);
CREATE INDEX IF NOT EXISTS idx_citizens_created_at ON citizens(created_at DESC);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
CREATE TRIGGER update_wards_updated_at BEFORE UPDATE ON wards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_villages_updated_at BEFORE UPDATE ON villages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_citizens_updated_at BEFORE UPDATE ON citizens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE villages ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE citizens ENABLE ROW LEVEL SECURITY;

-- Public access policies (for now - can be restricted later with authentication)
-- These allow all operations for anonymous users
CREATE POLICY "Allow public read access on wards" ON wards
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on wards" ON wards
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on wards" ON wards
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on wards" ON wards
  FOR DELETE USING (true);

CREATE POLICY "Allow public read access on villages" ON villages
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on villages" ON villages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on villages" ON villages
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on villages" ON villages
  FOR DELETE USING (true);

CREATE POLICY "Allow public read access on households" ON households
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on households" ON households
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on households" ON households
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on households" ON households
  FOR DELETE USING (true);

CREATE POLICY "Allow public read access on citizens" ON citizens
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on citizens" ON citizens
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on citizens" ON citizens
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on citizens" ON citizens
  FOR DELETE USING (true);

-- =====================================================
-- STORAGE BUCKETS for Photos and Fingerprints
-- =====================================================

-- Create storage bucket for citizen photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('citizen-photos', 'citizen-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for fingerprints
INSERT INTO storage.buckets (id, name, public)
VALUES ('citizen-fingerprints', 'citizen-fingerprints', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for citizen-photos bucket
CREATE POLICY "Allow public upload to citizen-photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'citizen-photos');

CREATE POLICY "Allow public read from citizen-photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'citizen-photos');

CREATE POLICY "Allow public update to citizen-photos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'citizen-photos');

CREATE POLICY "Allow public delete from citizen-photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'citizen-photos');

-- Storage policies for citizen-fingerprints bucket
CREATE POLICY "Allow public upload to citizen-fingerprints" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'citizen-fingerprints');

CREATE POLICY "Allow public read from citizen-fingerprints" ON storage.objects
  FOR SELECT USING (bucket_id = 'citizen-fingerprints');

CREATE POLICY "Allow public update to citizen-fingerprints" ON storage.objects
  FOR UPDATE USING (bucket_id = 'citizen-fingerprints');

CREATE POLICY "Allow public delete from citizen-fingerprints" ON storage.objects
  FOR DELETE USING (bucket_id = 'citizen-fingerprints');

-- =====================================================
-- VIEWS for Analytics
-- =====================================================

-- View for citizen statistics by ward
CREATE OR REPLACE VIEW ward_statistics AS
SELECT
  w.id AS ward_id,
  w.code AS ward_code,
  w.name AS ward_name,
  COUNT(DISTINCT v.id) AS village_count,
  COUNT(DISTINCT h.id) AS household_count,
  COUNT(c.id) AS citizen_count,
  COUNT(c.id) FILTER (WHERE c.sex = 'male') AS male_count,
  COUNT(c.id) FILTER (WHERE c.sex = 'female') AS female_count,
  COUNT(c.id) FILTER (WHERE c.disability_status != 'none') AS disability_count,
  COUNT(c.id) FILTER (WHERE c.photo_url IS NOT NULL) AS with_photo_count
FROM wards w
LEFT JOIN villages v ON v.ward_id = w.id
LEFT JOIN households h ON h.village_id = v.id
LEFT JOIN citizens c ON c.ward_id = w.id
GROUP BY w.id, w.code, w.name;

-- View for overall statistics
CREATE OR REPLACE VIEW overall_statistics AS
SELECT
  COUNT(DISTINCT w.id) AS total_wards,
  COUNT(DISTINCT v.id) AS total_villages,
  COUNT(DISTINCT h.id) AS total_households,
  COUNT(c.id) AS total_citizens,
  COUNT(c.id) FILTER (WHERE c.sex = 'male') AS total_male,
  COUNT(c.id) FILTER (WHERE c.sex = 'female') AS total_female,
  COUNT(c.id) FILTER (WHERE c.disability_status != 'none') AS total_with_disability,
  COUNT(c.id) FILTER (WHERE c.photo_url IS NOT NULL) AS total_with_photo,
  COUNT(c.id) FILTER (WHERE c.consent_given = true) AS total_with_consent
FROM wards w
LEFT JOIN villages v ON v.ward_id = w.id
LEFT JOIN households h ON h.village_id = v.id
LEFT JOIN citizens c ON c.id IS NOT NULL;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to get next citizen ID number
CREATE OR REPLACE FUNCTION get_next_citizen_number()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COALESCE(MAX(CAST(SUBSTRING(unique_id FROM '[0-9]+$') AS INTEGER)), 0) + 1 FROM citizens);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE wards IS 'Administrative wards in Madang Province';
COMMENT ON TABLE villages IS 'Villages within each ward';
COMMENT ON TABLE households IS 'Household units with GPS coordinates';
COMMENT ON TABLE citizens IS 'Individual citizen records with biometric data';
COMMENT ON COLUMN citizens.photo_url IS 'URL to photo in Supabase Storage';
COMMENT ON COLUMN citizens.fingerprint_url IS 'URL to fingerprint image in Supabase Storage';
COMMENT ON COLUMN citizens.device_id IS 'ID of device that created this record';
COMMENT ON COLUMN citizens.synced_at IS 'Last sync timestamp from local device';
