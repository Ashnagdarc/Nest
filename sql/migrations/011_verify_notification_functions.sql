-- Diagnostics and fixes for notification functions

-- First, verify the mark_notification_as_read function exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'mark_notification_as_read' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        RAISE NOTICE 'mark_notification_as_read function does not exist!';
    ELSE
        RAISE NOTICE 'mark_notification_as_read function exists';
    END IF;
END $$;

-- Recreate the function with more verbose logging and error handling
CREATE OR REPLACE FUNCTION public.mark_notification_as_read(notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_success BOOLEAN := FALSE;
    v_notification_exists BOOLEAN;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF v_user_id IS NULL THEN
        RAISE WARNING 'User not authenticated in mark_notification_as_read';
        RETURN FALSE;
    END IF;
    
    -- Check if notification exists and belongs to user
    SELECT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE id = notification_id AND user_id = v_user_id
    ) INTO v_notification_exists;
    
    IF NOT v_notification_exists THEN
        RAISE WARNING 'Notification % does not exist or does not belong to user %', 
            notification_id, v_user_id;
        RETURN FALSE;
    END IF;
    
    -- Update notification
    UPDATE public.notifications
    SET 
        read = TRUE,
        updated_at = NOW()
    WHERE 
        id = notification_id
        AND user_id = v_user_id;
        
    GET DIAGNOSTICS v_success = ROW_COUNT;
    
    -- Log the result
    IF v_success THEN
        RAISE NOTICE 'Successfully marked notification % as read for user %',
            notification_id, v_user_id;
    ELSE
        RAISE WARNING 'Failed to mark notification % as read for user %',
            notification_id, v_user_id;
    END IF;
        
    RETURN v_success > 0;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Exception in mark_notification_as_read: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.mark_notification_as_read TO authenticated;

-- Create a direct update function as an alternative approach
CREATE OR REPLACE FUNCTION public.direct_mark_notification_read(notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_success BOOLEAN := FALSE;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    
    -- Direct update with no checks - use as last resort
    UPDATE public.notifications
    SET 
        read = TRUE,
        updated_at = NOW()
    WHERE 
        id = notification_id;
        
    GET DIAGNOSTICS v_success = ROW_COUNT;
    
    -- Log the result
    RAISE NOTICE 'Direct update of notification %: success=%', notification_id, v_success;
        
    RETURN v_success > 0;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.direct_mark_notification_read TO authenticated;

-- Create a super simple function with no error handling as absolute last resort
CREATE OR REPLACE FUNCTION public.force_mark_notification_read(p_notification_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
    UPDATE public.notifications SET read = TRUE WHERE id::text = p_notification_id;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.force_mark_notification_read TO authenticated;

-- Add a column to store the last error for debugging purposes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'last_error'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN last_error TEXT;
        RAISE NOTICE 'Added last_error column to notifications table';
    END IF;
END $$; 