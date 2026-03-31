-- Run in Supabase SQL Editor to add the staff notes table

CREATE TABLE IF NOT EXISTS staff_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid REFERENCES outlets(id) ON DELETE CASCADE,
  target_phone text NOT NULL,
  target_name text NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE staff_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access" ON staff_notes;
CREATE POLICY "Allow public access" ON staff_notes FOR ALL USING (true) WITH CHECK (true);
