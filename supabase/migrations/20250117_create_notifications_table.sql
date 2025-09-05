-- Create notifications table for system notifications
-- This table stores all system notifications for users

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('Request', 'Approval', 'Rejection', 'Reminder', 'System', 'Maintenance', 'Overdue')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    link TEXT,
    metadata JSONB DEFAULT '{}',
    category TEXT,
    priority TEXT DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON public.notifications(expires_at);

-- Create composite index for user notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
ON public.notifications(user_id, is_read, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own notifications
CREATE POLICY "notifications_select_own" ON public.notifications
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "notifications_update_own" ON public.notifications
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "notifications_delete_own" ON public.notifications
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Anyone can insert notifications (for system notifications)
CREATE POLICY "notifications_insert_all" ON public.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Admins can view all notifications
CREATE POLICY "notifications_admin_select_all" ON public.notifications
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Service role can manage all notifications
CREATE POLICY "notifications_service_role_all" ON public.notifications
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_notifications_updated_at();

-- Create function to get user's unread notification count
CREATE OR REPLACE FUNCTION public.get_user_unread_notification_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT COUNT(*)
    FROM public.notifications
    WHERE user_id = p_user_id 
    AND is_read = false
    AND (expires_at IS NULL OR expires_at > NOW());
$$;

-- Create function to get user's notifications with pagination
CREATE OR REPLACE FUNCTION public.get_user_notifications(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_unread_only BOOLEAN DEFAULT false
)
RETURNS TABLE(
    id UUID,
    type TEXT,
    title TEXT,
    message TEXT,
    is_read BOOLEAN,
    link TEXT,
    metadata JSONB,
    category TEXT,
    priority TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        n.id,
        n.type,
        n.title,
        n.message,
        n.is_read,
        n.link,
        n.metadata,
        n.category,
        n.priority,
        n.expires_at,
        n.created_at
    FROM public.notifications n
    WHERE n.user_id = p_user_id
    AND (NOT p_unread_only OR n.is_read = false)
    AND (n.expires_at IS NULL OR n.expires_at > NOW())
    ORDER BY n.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- Create function to mark notifications as read
CREATE OR REPLACE FUNCTION public.mark_notifications_as_read(
    p_user_id UUID,
    p_notification_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    IF p_notification_ids IS NULL THEN
        -- Mark all user's notifications as read
        UPDATE public.notifications
        SET is_read = true, updated_at = NOW()
        WHERE user_id = p_user_id AND is_read = false;
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
    ELSE
        -- Mark specific notifications as read
        UPDATE public.notifications
        SET is_read = true, updated_at = NOW()
        WHERE user_id = p_user_id 
        AND id = ANY(p_notification_ids)
        AND is_read = false;
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
    END IF;
    
    RETURN updated_count;
END;
$$;

-- Create function to clean up expired notifications
CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.notifications
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Add comments
COMMENT ON TABLE public.notifications IS 'System notifications for users';
COMMENT ON COLUMN public.notifications.type IS 'Type of notification: Request, Approval, Rejection, Reminder, System, Maintenance, Overdue';
COMMENT ON COLUMN public.notifications.priority IS 'Priority level: Low, Normal, High, Urgent';
COMMENT ON COLUMN public.notifications.metadata IS 'Additional data related to the notification';
COMMENT ON COLUMN public.notifications.expires_at IS 'When the notification expires and should be removed';
COMMENT ON COLUMN public.notifications.link IS 'Optional link to related page or action';

