-- Step 1: Add announcement support to notifications table
DO $$
BEGIN
    -- Add announcement type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'is_announcement'
    ) THEN
        ALTER TABLE public.notifications 
        ADD COLUMN is_announcement BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add read_by array to store who has read the notification
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'read_by'
    ) THEN
        ALTER TABLE public.notifications 
        ADD COLUMN read_by UUID[] DEFAULT ARRAY[]::UUID[];
    END IF;
END $$;

-- Step 2: Create a function to mark a notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(
    p_notification_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update the read_by array to include the user if not already present
    UPDATE public.notifications 
    SET read_by = array_append(read_by, p_user_id)
    WHERE id = p_notification_id 
    AND NOT (p_user_id = ANY(read_by));
    
    RETURN TRUE;
END;
$$;

-- Step 3: Create a function to create announcement type notifications
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
        message,  -- Changed from content to message
        user_id,  -- Set to created_by for announcements
        created_by,
        is_announcement,
        type,
        read_by,
        is_read,  -- Set default for compatibility
        metadata  -- Include any metadata
    )
    VALUES (
        p_title,
        p_content,  -- The content goes into message field
        p_created_by,  -- For announcements, user_id is the creator
        p_created_by,
        TRUE,
        'announcement',
        ARRAY[]::UUID[],
        FALSE,
        jsonb_build_object('announcement', true)
    )
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$;

-- Step 4: Migrate existing announcements data
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'announcements'
    ) THEN
        -- First, migrate the announcements
        INSERT INTO public.notifications (
            id,
            title,
            content,
            created_by,
            created_at,
            updated_at,
            is_announcement,
            type,
            read_by
        )
        SELECT 
            a.id,
            a.title,
            a.content,
            a.created_by,
            a.created_at,
            a.updated_at,
            TRUE,
            'announcement',
            -- Convert read_announcements into an array of user IDs
            ARRAY(
                SELECT user_id 
                FROM public.read_announcements ra 
                WHERE ra.announcement_id = a.id
            )
        FROM public.announcements a
        ON CONFLICT (id) DO UPDATE
        SET read_by = notifications.read_by || EXCLUDED.read_by;
        
        -- After successful migration, drop the old tables
        DROP TABLE IF EXISTS public.read_announcements;
        DROP TABLE IF EXISTS public.announcements;
    END IF;
END $$;

-- Step 5: Create updated RLS policies for announcements
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
