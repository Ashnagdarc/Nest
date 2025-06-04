-- 1. Add notification_preferences to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'::jsonb;

-- 2. Add metadata and category to notifications
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS category TEXT;

-- 3. Remove redundant read column
ALTER TABLE public.notifications
DROP COLUMN IF EXISTS read;

-- 4. Insert branding and notification defaults into app_settings
INSERT INTO public.app_settings (key, value, updated_at) VALUES
  ('brand_logo_url', 'https://yourdomain.com/logo.png', now()),
  ('brand_primary_color', '#0070F3', now()),
  ('notification_defaults', '{"email":true,"push":true,"in_app":true}', now())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now(); 