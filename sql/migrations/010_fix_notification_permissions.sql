-- Fix permissions for the notifications table
-- This ensures that users can read and update their own notifications

-- First let's ensure the table has RLS enabled
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Check if there are any notification access policies
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) 
    INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'notifications';
    
    RAISE NOTICE 'Found % existing policies for notifications table', policy_count;
    
    -- If no policies exist, create them
    IF policy_count = 0 THEN
        RAISE NOTICE 'Creating new policies for notifications table';
        
        -- Users can view their own notifications
        CREATE POLICY "Users can view their own notifications" 
        ON public.notifications FOR SELECT 
        USING (auth.uid() = user_id);
        
        -- Users can update their own notifications (mark as read)
        CREATE POLICY "Users can update their own notifications" 
        ON public.notifications FOR UPDATE 
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
        
        -- Admins can view all notifications (for monitoring)
        CREATE POLICY "Admins can view all notifications" 
        ON public.notifications FOR SELECT 
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role = 'Admin'
            )
        );
        
        -- Admins can update all notifications
        CREATE POLICY "Admins can update all notifications" 
        ON public.notifications FOR UPDATE 
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role = 'Admin'
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role = 'Admin'
            )
        );
        
        -- System can insert notifications for any user
        CREATE POLICY "System can insert notifications" 
        ON public.notifications FOR INSERT 
        TO authenticated
        WITH CHECK (true);
    ELSE
        RAISE NOTICE 'Policies already exist, checking for specific policies...';
        
        -- Check for user update policy
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'notifications'
            AND policyname LIKE '%user%update%'
        ) THEN
            RAISE NOTICE 'Adding user update policy';
            CREATE POLICY "Users can update their own notifications" 
            ON public.notifications FOR UPDATE 
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
        END IF;
    END IF;
END
$$;

-- Make sure the table has the necessary columns
DO $$
BEGIN
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.notifications 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        RAISE NOTICE 'Added updated_at column to notifications table';
    END IF;
    
    -- Add type column with default if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'type'
    ) THEN
        ALTER TABLE public.notifications 
        ADD COLUMN type TEXT DEFAULT 'system';
        
        RAISE NOTICE 'Added type column to notifications table';
    END IF;
END
$$;

-- Create or replace a function to mark notifications as read
CREATE OR REPLACE FUNCTION public.mark_notification_as_read(notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.notifications
    SET 
        read = true,
        updated_at = NOW()
    WHERE 
        id = notification_id
        AND user_id = auth.uid();
        
    RETURN FOUND;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.mark_notification_as_read TO authenticated;

-- Create a function to mark all notifications as read for the current user
CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.notifications
    SET 
        read = true,
        updated_at = NOW()
    WHERE 
        user_id = auth.uid()
        AND read = false;
        
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_as_read TO authenticated; 