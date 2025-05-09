-- Direct fix for notifications table to ensure it works properly

-- First, check if the notifications table exists properly
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    RAISE NOTICE 'Notifications table does not exist, creating it now';
    
    CREATE TABLE public.notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      type TEXT DEFAULT 'system',
      title TEXT,
      message TEXT NOT NULL,
      read BOOLEAN DEFAULT FALSE,
      link TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_error TEXT
    );
  END IF;
END $$;

-- Next, ensure RLS is enabled
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to ensure we have a clean slate
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN (
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'notifications' AND schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', policy_name);
    RAISE NOTICE 'Dropped policy %', policy_name;
  END LOOP;
END $$;

-- Create robust policies
-- Allow anyone to view their own notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT 
USING (user_id = auth.uid());

-- Allow users to update their own notifications
CREATE POLICY "Users can update their own notifications" 
ON public.notifications FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow anyone to insert notifications
CREATE POLICY "Anyone can insert notifications" 
ON public.notifications FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Create an ownership-based trigger
CREATE OR REPLACE FUNCTION maintain_notification_user_ownership()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure we never change the user_id once set
  IF TG_OP = 'UPDATE' THEN
    NEW.user_id := OLD.user_id;
  END IF;
  
  -- Auto-update timestamps
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add the trigger
DROP TRIGGER IF EXISTS notification_maintain_ownership ON public.notifications;
CREATE TRIGGER notification_maintain_ownership
BEFORE UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION maintain_notification_user_ownership();

-- Extreme fix: In case something is wrong with the database, manually update all notifications
-- This is a one-time fix that marks all notifications as read
UPDATE public.notifications
SET read = TRUE, updated_at = NOW(), last_error = 'Manual fix via migration 012'
WHERE read = FALSE;

-- Grant full permissions to authenticated users
GRANT ALL ON public.notifications TO authenticated;

-- Create a simple procedure to mark a notification as read
-- This uses SECURITY DEFINER to run as the DB owner, bypassing RLS
CREATE OR REPLACE PROCEDURE mark_notification_read(p_notification_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.notifications
  SET read = TRUE, updated_at = NOW()
  WHERE id = p_notification_id;
  
  RAISE NOTICE 'Marked notification % as read via procedure', p_notification_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON PROCEDURE mark_notification_read TO authenticated;

-- Create read_notifications table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'read_notifications') THEN
    RAISE NOTICE 'Creating read_notifications table';
    
    CREATE TABLE public.read_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, notification_id)
    );

    -- Create indexes for better performance
    CREATE INDEX idx_read_notifications_user_id ON read_notifications(user_id);
    CREATE INDEX idx_read_notifications_notification_id ON read_notifications(notification_id);
    CREATE INDEX idx_read_notifications_created_at ON read_notifications(created_at DESC);

    -- Enable RLS
    ALTER TABLE read_notifications ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Users can view their own read notifications"
    ON read_notifications FOR SELECT
    USING (user_id = auth.uid());

    CREATE POLICY "Users can insert their own read notifications"
    ON read_notifications FOR INSERT
    WITH CHECK (user_id = auth.uid());

    -- Grant access to authenticated users
    GRANT ALL ON read_notifications TO authenticated;
  END IF;
END $$;

-- Sync existing read notifications
DO $$
BEGIN
  INSERT INTO read_notifications (user_id, notification_id)
  SELECT n.user_id, n.id
  FROM notifications n
  WHERE n.read = true
  ON CONFLICT (user_id, notification_id) DO NOTHING;
END $$; 