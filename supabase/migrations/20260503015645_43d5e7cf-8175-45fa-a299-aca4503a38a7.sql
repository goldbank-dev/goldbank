-- Remove the overly broad select policy if it still exists (the linter indicates it might)
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can list their own avatar" ON storage.objects;

-- Create a more restricted policy for listing/viewing objects in the avatars bucket
-- This prevents users from listing ALL files in the bucket
CREATE POLICY "Users can view/list their own avatar metadata"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'avatars' 
  AND (
    -- Admins can see everything
    has_role(auth.uid(), 'admin')
    OR 
    -- Users can only see files in their own folder
    (auth.uid()::text = (storage.foldername(name))[1])
  )
);