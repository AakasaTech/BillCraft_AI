-- Create logos storage bucket (public reads, 2 MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- DROP before CREATE because CREATE POLICY has no IF NOT EXISTS in Postgres
DROP POLICY IF EXISTS "logos_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "logos_auth_insert"  ON storage.objects;
DROP POLICY IF EXISTS "logos_auth_update"  ON storage.objects;
DROP POLICY IF EXISTS "logos_auth_delete"  ON storage.objects;

-- Public read (anyone can view logos via their public URL)
CREATE POLICY "logos_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

-- Authenticated users can upload/replace
CREATE POLICY "logos_auth_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'logos');

-- Authenticated users can update
CREATE POLICY "logos_auth_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'logos');

-- Authenticated users can delete
CREATE POLICY "logos_auth_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'logos');
