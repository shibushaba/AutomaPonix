-- Phase 12: Data Schema Expansion & Image Uploads

-- 1. Add new columns for KM and Color
ALTER TABLE bikes 
ADD COLUMN km integer,
ADD COLUMN color text;

-- 2. Setup the Storage Bucket for Images
-- Note: Replace 'bike-images' if you prefer a different bucket name.
-- You can run this in the SQL editor or just create a PUBLIC bucket named "bike-images" from the Supabase Storage Dashboard.

insert into storage.buckets (id, name, public)
values ('bike-images', 'bike-images', true)
on conflict (id) do nothing;

-- Provide public access to the bike-images bucket
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'bike-images' );

-- Allow authenticated (or anon if you don't have auth setup cleanly) to insert files
create policy "Allow uploads"
  on storage.objects for insert
  with check ( bucket_id = 'bike-images' );
