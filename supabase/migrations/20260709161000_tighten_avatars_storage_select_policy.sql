-- Public avatar URLs work via the public bucket CDN without a broad SELECT policy.
-- Removing bucket-wide SELECT prevents clients from listing every file in the bucket.
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
