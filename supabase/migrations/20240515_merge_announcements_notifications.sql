-- Step 1: Add announcement type and read tracking to notifications table
DO $$ 
BEGIN
    -- Add announcement_type if it doesn't exist
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
END $$;

-- Step 2: Create a junction table for tracking read status
CREATE TABLE IF NOT EXISTS public.notification_reads (
    notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (notification_id, user_id)
);

-- Step 3: Enable RLS on the new table
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- Step 4: Add RLS policies for the junction table
CREATE POLICY "Users can read their own notification read status"
    ON public.notification_reads
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own read status"
    ON public.notification_reads
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own read status"
    ON public.notification_reads
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Step 5: Migrate existing announcements data if the table exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'announcements'
    ) THEN
        -- Insert announcements into notifications
        INSERT INTO public.notifications (
            id,
            title,
            content,
            created_by,
            created_at,
            updated_at,
            is_announcement
        )
        SELECT 
            id,
            title,
            content,
            created_by,
            created_at,
            updated_at,
            TRUE
        FROM public.announcements
        ON CONFLICT (id) DO NOTHING;

        -- Migrate read status if read_announcements table exists
        IF EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'read_announcements'
        ) THEN
            INSERT INTO public.notification_reads (
                notification_id,
                user_id,
                read_at
            )
            SELECT 
                announcement_id,
                user_id,
                read_at
            FROM public.read_announcements
            ON CONFLICT (notification_id, user_id) DO NOTHING;
        END IF;

        -- Drop old tables after successful migration
        DROP TABLE IF EXISTS public.read_announcements;
        DROP TABLE IF EXISTS public.announcements;
    END IF;
END $$;

-- Step 6: Create function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(
    p_notification_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.notification_reads (notification_id, user_id)
    VALUES (p_notification_id, auth.uid())
    ON CONFLICT (notification_id, user_id) DO NOTHING;
    
    RETURN TRUE;
END;
$$;
