-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars

-- 1. Allow public access to view avatars
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 2. Allow users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- 3. Allow users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- 4. Allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- 5. Allow admins to manage all avatars
-- Note: Requires a way to check admin role, using our existing has_role function
CREATE POLICY "Admins can manage all avatars"
ON storage.objects FOR ALL
USING (
  bucket_id = 'avatars' AND
  public.has_role(auth.uid(), 'admin')
);