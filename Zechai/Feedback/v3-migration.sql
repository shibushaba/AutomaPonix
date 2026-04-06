-- ============================================================
-- REVUMATE Cafe Feedback System — Supabase Migration (v3)
-- Run this completely in the Supabase SQL Editor
-- WARNING: This creates the Enterprise Multi-Outlet structure
-- ============================================================

-- 1. Create Core Master Tables
CREATE TABLE IF NOT EXISTS outlets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  manager_name text NOT NULL,
  manager_phone text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Store staff globally but assigned to outlets
CREATE TABLE IF NOT EXISTS outlet_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid REFERENCES outlets(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'staff', -- 'kitchen', 'service', etc.
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Master Admin Analytics Vault
CREATE TABLE IF NOT EXISTS master_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  ai_content text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Alter existing tables to add columns
ALTER TABLE customer_feedback ADD COLUMN IF NOT EXISTS outlet_id uuid REFERENCES outlets(id) ON DELETE CASCADE;
ALTER TABLE staff_reports ADD COLUMN IF NOT EXISTS outlet_id uuid REFERENCES outlets(id) ON DELETE CASCADE;
ALTER TABLE staff_marks ADD COLUMN IF NOT EXISTS outlet_id uuid REFERENCES outlets(id) ON DELETE CASCADE;
ALTER TABLE saved_daily_reports ADD COLUMN IF NOT EXISTS outlet_id uuid REFERENCES outlets(id) ON DELETE CASCADE;

ALTER TABLE staff_reports ADD COLUMN IF NOT EXISTS is_manager_report boolean DEFAULT false;
ALTER TABLE staff_reports ADD COLUMN IF NOT EXISTS target_employee_id uuid REFERENCES outlet_staff(id) ON DELETE SET NULL;
ALTER TABLE staff_reports ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES outlet_staff(id) ON DELETE CASCADE;

-- 3. Create the HQ Outlet dynamically (to prevent data loss of old records)
DO $$
DECLARE
  hq_id uuid;
BEGIN
  -- Insert a default Head Quarters outlet if no outlets exist
  IF NOT EXISTS (SELECT 1 FROM outlets) THEN
    INSERT INTO outlets (name, manager_name, manager_phone)
    VALUES ('Revumate HQ', 'Master Admin', '0000000000')
    RETURNING id INTO hq_id;
  ELSE
    SELECT id INTO hq_id FROM outlets LIMIT 1;
  END IF;

  -- Update any existing old data to belong to the HQ Outlet
  UPDATE customer_feedback SET outlet_id = hq_id WHERE outlet_id IS NULL;
  UPDATE staff_reports SET outlet_id = hq_id WHERE outlet_id IS NULL;
  UPDATE staff_marks SET outlet_id = hq_id WHERE outlet_id IS NULL;
  UPDATE saved_daily_reports SET outlet_id = hq_id WHERE outlet_id IS NULL;

END $$;

-- 4. Enable Row Level Security (RLS) for new tables
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_reports ENABLE ROW LEVEL SECURITY;

-- 5. Drop old if re-running
DROP POLICY IF EXISTS "Allow public access" ON outlets;
DROP POLICY IF EXISTS "Allow public access" ON outlet_staff;
DROP POLICY IF EXISTS "Allow public access" ON master_reports;

-- 6. Grant Anon Access (Application Layer handles authentication)
CREATE POLICY "Allow public access" ON outlets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON outlet_staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON master_reports FOR ALL USING (true) WITH CHECK (true);

-- Done! The database is now Franchise-Ready.
