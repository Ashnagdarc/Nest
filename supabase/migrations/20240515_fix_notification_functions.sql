-- Function to mark a notification as read
DROP FUNCTION IF EXISTS mark_notification_read_simple(UUID);

CREATE OR REPLACE FUNCTION mark_notification_read_simple(
    notification_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated BOOLEAN;
    v_user_id UUID;
BEGIN
    -- Get the current user ID
    v_user_id := auth.uid();
    
    -- Log the attempt
    RAISE NOTICE 'Attempting to mark notification % as read for user %', notification_id, v_user_id;
    
    UPDATE notifications
    SET is_read = true,
        updated_at = NOW()
    WHERE id = notification_id
    AND (
        -- Allow update if user owns the notification OR is an admin
        user_id = v_user_id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = v_user_id 
            AND role = 'Admin'
        )
    )
    RETURNING true INTO v_updated;
    
    IF v_updated THEN
        RETURN jsonb_build_object(
            'success', true,
            'notification_id', notification_id,
            'user_id', v_user_id
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Notification not found or not authorized',
            'notification_id', notification_id,
            'user_id', v_user_id
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE,
            'notification_id', notification_id,
            'user_id', v_user_id
        );
END;
$$;

-- Grant access to authenticated users
REVOKE ALL ON FUNCTION mark_notification_read_simple(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION mark_notification_read_simple(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read_simple(UUID) TO authenticated;

-- Update notifications table permissions if needed
GRANT SELECT, UPDATE ON notifications TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Update or create RLS policies
DROP POLICY IF EXISTS "Admins can update any notification" ON notifications;
CREATE POLICY "Admins can update any notification"
ON notifications FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'Admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'Admin'
    )
);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
