DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;

CREATE POLICY "Users can list their own avatar"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND (auth.uid())::text = (storage.foldername(name))[1]
);