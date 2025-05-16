-- Create functions for admin notifications
CREATE OR REPLACE FUNCTION admin_mark_notification_read(
    p_notification_id UUID
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
    
    -- Verify the user is an admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = v_user_id 
        AND role = 'Admin'
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User is not an admin',
            'notification_id', p_notification_id,
            'user_id', v_user_id
        );
    END IF;
    
    UPDATE notifications
    SET is_read = true,
        updated_at = NOW()
    WHERE id = p_notification_id
    RETURNING true INTO v_updated;
    
    IF v_updated THEN
        RETURN jsonb_build_object(
            'success', true,
            'notification_id', p_notification_id,
            'user_id', v_user_id
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Notification not found',
            'notification_id', p_notification_id,
            'user_id', v_user_id
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE,
            'notification_id', p_notification_id,
            'user_id', v_user_id
        );
END;
$$;

-- Function to mark all notifications as read for admin
CREATE OR REPLACE FUNCTION admin_mark_all_notifications_read()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated_count INTEGER;
    v_user_id UUID;
BEGIN
    -- Get the current user ID
    v_user_id := auth.uid();
    
    -- Verify the user is an admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = v_user_id 
        AND role = 'Admin'
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User is not an admin',
            'user_id', v_user_id
        );
    END IF;
    
    UPDATE notifications
    SET is_read = true,
        updated_at = NOW()
    WHERE is_read = false
    RETURNING COUNT(*) INTO v_updated_count;
    
    RETURN jsonb_build_object(
        'success', true,
        'updated_count', v_updated_count,
        'user_id', v_user_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE
        );
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION admin_mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_mark_all_notifications_read() TO authenticated;
