
-- Make evidencia-fotos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'evidencia-fotos';

-- Drop old public policy
DROP POLICY IF EXISTS "Anyone can view evidence photos" ON storage.objects;

-- Create authenticated-only view policy
CREATE POLICY "Authenticated users can view evidence photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'evidencia-fotos');
