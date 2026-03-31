-- Run this in Supabase SQL Editor to wipe the placeholder HQ and old data
-- WARNING: This deletes ALL existing feedback, reports, staff data. Fresh start.

TRUNCATE TABLE customer_feedback CASCADE;
TRUNCATE TABLE staff_reports CASCADE;
TRUNCATE TABLE staff_marks CASCADE;
TRUNCATE TABLE staff_achievements CASCADE;
TRUNCATE TABLE saved_daily_reports CASCADE;
TRUNCATE TABLE outlet_staff CASCADE;
TRUNCATE TABLE master_reports CASCADE;
DELETE FROM outlets;
