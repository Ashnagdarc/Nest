-- Create user_push_tokens table for Firebase Cloud Messaging push token storage
-- This table stores FCM tokens for each user to enable push notifications

CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  client_info JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can manage their own push tokens
CREATE POLICY "Users can manage own push tokens" ON public.user_push_tokens
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can view all push tokens for administrative purposes
CREATE POLICY "Admins can view all push tokens" ON public.user_push_tokens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'Admin'
    )
  );

-- Create index on user_id for faster lookups
CREATE INDEX idx_user_push_tokens_user_id ON public.user_push_tokens(user_id);
CREATE INDEX idx_user_push_tokens_token ON public.user_push_tokens(token);

-- Add comment for documentation
COMMENT ON TABLE public.user_push_tokens IS 'Stores Firebase Cloud Messaging (FCM) tokens for each user. Tokens are used to send push notifications to users. Users can only manage their own tokens; admins can view all tokens.';
COMMENT ON COLUMN public.user_push_tokens.token IS 'The FCM registration token from the client browser/device';
COMMENT ON COLUMN public.user_push_tokens.client_info IS 'Optional metadata about the client (user agent, device info, etc.)';
COMMENT ON COLUMN public.user_push_tokens.expires_at IS 'Optional expiration timestamp for token invalidation';
