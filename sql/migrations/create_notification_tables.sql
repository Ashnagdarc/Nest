-- Check if the notifications table exists
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) NOT NULL,
    type TEXT NOT NULL, -- 'system', 'gear', 'profile', etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    link TEXT, -- Optional link for navigation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on the notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications table

-- Allow users to see their own notifications
CREATE POLICY IF NOT EXISTS "Users can view their own notifications"
ON notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to update their own notifications (mark as read)
CREATE POLICY IF NOT EXISTS "Users can update their own notifications"
ON notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow admins full access to all notifications
CREATE POLICY IF NOT EXISTS "Admins have full access to notifications"
ON notifications
USING (
    auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'Admin'
    )
);

-- Allow superadmin role to manage all notifications 
CREATE POLICY IF NOT EXISTS "SuperAdmins can manage all notifications"
ON notifications
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'SuperAdmin'
    )
);

-- Create function for creating notifications
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_link TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        link,
        read,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_type,
        p_title,
        p_message,
        p_link,
        false,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$;

-- Create index for faster notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Function to create a notification for all users
CREATE OR REPLACE FUNCTION create_notification_for_all_users(
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_link TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user record;
BEGIN
    FOR v_user IN
        SELECT id FROM profiles WHERE status = 'active'
    LOOP
        PERFORM create_notification(
            v_user.id,
            p_type,
            p_title,
            p_message,
            p_link
        );
    END LOOP;
END;
$$; 