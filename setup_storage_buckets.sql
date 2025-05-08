-- Create necessary storage buckets for the application

----- AVATARS BUCKET -----
-- Create avatars bucket for user profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read avatars (they're public)
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatars
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own avatars
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (bucket_id = 'avatars');

-- Allow users to delete their own avatars
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

----- BRANDING BUCKET -----
-- Create branding bucket for app logos and assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view branding assets
DROP POLICY IF EXISTS "Anyone can view branding" ON storage.objects;
CREATE POLICY "Anyone can view branding"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

-- Only admins can upload branding assets
DROP POLICY IF EXISTS "Only admins can manage branding" ON storage.objects;
CREATE POLICY "Only admins can manage branding"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'branding' AND
  (SELECT private.is_admin(auth.uid()))
);

----- GEAR IMAGES BUCKET -----
-- Create gear_images bucket for equipment photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('gear_images', 'gear_images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view gear images
DROP POLICY IF EXISTS "Anyone can view gear images" ON storage.objects;
CREATE POLICY "Anyone can view gear images"
ON storage.objects FOR SELECT
USING (bucket_id = 'gear_images');

-- Only admins can manage gear images
DROP POLICY IF EXISTS "Only admins can manage gear images" ON storage.objects;
CREATE POLICY "Only admins can manage gear images"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'gear_images' AND
  (SELECT private.is_admin(auth.uid()))
);

-- Add special policy for admins that gives unlimited access to all buckets
DROP POLICY IF EXISTS "Admins have full access to all storage" ON storage.objects;
CREATE POLICY "Admins have full access to all storage"
ON storage.objects FOR ALL
TO authenticated
USING ((SELECT private.is_admin(auth.uid()))); 