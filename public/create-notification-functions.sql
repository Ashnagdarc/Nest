-- Drop existing functions first
DROP FUNCTION IF EXISTS get_user_notifications(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS fetch_user_notifications(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS mark_notification_read_simple(UUID);
DROP FUNCTION IF EXISTS mark_all_notifications_read_simple();

-- Function to get user notifications
CREATE OR REPLACE FUNCTION get_user_notifications(
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS SETOF notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM notifications n
    WHERE n.user_id = auth.uid()
    ORDER BY n.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_user_notifications(INTEGER, INTEGER) TO authenticated;

-- Function to fetch user notifications with additional metadata
CREATE OR REPLACE FUNCTION fetch_user_notifications(
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    type TEXT,
    title TEXT,
    message TEXT,
    is_read BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    link TEXT,
    metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.user_id,
        n.type,
        n.title,
        n.message,
        n.is_read,
        n.created_at,
        n.updated_at,
        n.link,
        n.metadata
    FROM notifications n
    WHERE n.user_id = auth.uid()
    ORDER BY n.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION fetch_user_notifications(INTEGER, INTEGER) TO authenticated;

-- Function to mark a notification as read
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
BEGIN
    UPDATE notifications
    SET is_read = true,
        updated_at = NOW()
    WHERE id = notification_id
    AND user_id = auth.uid()
    RETURNING true INTO v_updated;
    
    IF v_updated THEN
        RETURN jsonb_build_object(
            'success', true,
            'notification_id', notification_id
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Notification not found or not owned by user',
            'notification_id', notification_id
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE,
            'notification_id', notification_id
        );
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION mark_notification_read_simple(UUID) TO authenticated;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read_simple()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    UPDATE notifications
    SET is_read = true,
        updated_at = NOW()
    WHERE user_id = auth.uid()
    AND is_read = false
    RETURNING COUNT(*) INTO v_updated_count;
    
    RETURN jsonb_build_object(
        'success', true,
        'updated_count', v_updated_count
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
GRANT EXECUTE ON FUNCTION mark_all_notifications_read_simple() TO authenticated; 