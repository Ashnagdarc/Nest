-- Create a backup of the old migration
ALTER TABLE public.notifications RENAME TO notifications_old;

-- Create the notifications table with the correct schema
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_announcement BOOLEAN DEFAULT FALSE,
    read_by UUID[] DEFAULT ARRAY[]::UUID[],
    link TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Copy data from old table
INSERT INTO public.notifications (
    id,
    user_id,
    type,
    title,
    message,
    is_read,
    created_at,
    updated_at,
    link,
    metadata
)
SELECT 
    id,
    user_id,
    type,
    title,
    message,
    is_read,
    created_at,
    updated_at,
    link,
    metadata
FROM notifications_old;

-- Drop old table after successful migration
DROP TABLE notifications_old;

-- Migrate announcements if they exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'announcements'
    ) THEN
        INSERT INTO public.notifications (
            id,
            title,
            message,
            user_id,
            created_by,
            created_at,
            updated_at,
            type,
            is_announcement,
            read_by,
            is_read,
            metadata
        )
        SELECT 
            a.id,
            a.title,
            a.content,
            a.created_by,
            a.created_by,
            a.created_at,
            a.updated_at,
            'announcement',
            TRUE,
            ARRAY(
                SELECT user_id 
                FROM public.read_announcements ra 
                WHERE ra.announcement_id = a.id
            ),
            FALSE,
            jsonb_build_object('announcement', true)
        FROM public.announcements a
        ON CONFLICT (id) DO UPDATE
        SET read_by = notifications.read_by || EXCLUDED.read_by;
        
        -- Drop old tables
        DROP TABLE IF EXISTS public.read_announcements;
        DROP TABLE IF EXISTS public.announcements;
    END IF;
END $$;

-- Create functions
CREATE OR REPLACE FUNCTION mark_notification_read(
    p_notification_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.notifications 
    SET read_by = array_append(read_by, p_user_id)
    WHERE id = p_notification_id 
    AND NOT (p_user_id = ANY(read_by));
    
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION create_announcement(
    p_title TEXT,
    p_content TEXT,
    p_created_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        title,
        message,
        user_id,
        created_by,
        type,
        is_announcement,
        read_by,
        is_read,
        metadata
    )
    VALUES (
        p_title,
        p_content,
        p_created_by,
        p_created_by,
        'announcement',
        TRUE,
        ARRAY[]::UUID[],
        FALSE,
        jsonb_build_object('announcement', true)
    )
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view announcements"
    ON public.notifications
    FOR SELECT
    USING (is_announcement = true OR user_id = auth.uid());

CREATE POLICY "Only admins can create announcements"
    ON public.notifications
    FOR INSERT
    WITH CHECK (
        (is_announcement = true AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'Admin'
        )) OR
        (is_announcement = false)
    );

CREATE POLICY "Only admins can update announcements"
    ON public.notifications
    FOR UPDATE
    USING (
        is_announcement = true AND 
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'Admin'
        )
    );
