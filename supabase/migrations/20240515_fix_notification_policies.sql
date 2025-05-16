-- Drop existing policies first
DROP POLICY IF EXISTS "Admins can update any notification" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- Add the admin update policy
CREATE POLICY "Admins can update any notification"
ON notifications
FOR UPDATE
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

-- Add back the user update policy
CREATE POLICY "Users can update their own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (
    auth.uid() = user_id AND 
    NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'Admin'
    )
)
WITH CHECK (
    auth.uid() = user_id AND 
    NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'Admin'
    )
);

-- Ensure RLS is enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, UPDATE ON notifications TO authenticated;
