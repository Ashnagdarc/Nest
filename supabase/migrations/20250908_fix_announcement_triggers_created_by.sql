-- Fix announcement triggers/functions to use created_by (actual column) instead of author_id
-- Safe to run multiple times via CREATE OR REPLACE

-- Function to create notifications for all users when an announcement is created
CREATE OR REPLACE FUNCTION public.create_announcement_notifications()
RETURNS TRIGGER AS $$
DECLARE
    user_record RECORD;
    author_name TEXT;
BEGIN
    -- Resolve author name from profiles using created_by
    SELECT full_name INTO author_name
    FROM public.profiles
    WHERE id = NEW.created_by;
    
    IF author_name IS NULL THEN
        author_name := 'Administrator';
    END IF;

    -- Create notifications for all active users
    FOR user_record IN 
        SELECT id, email, full_name
        FROM public.profiles
        WHERE status = 'Active' 
        AND email IS NOT NULL
    LOOP
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            category,
            priority,
            metadata,
            link
        ) VALUES (
            user_record.id,
            'Announcement',
            'New Announcement: ' || NEW.title,
            'A new announcement "' || NEW.title || '" has been posted by ' || author_name || '.',
            'announcement',
            'High',
            jsonb_build_object(
                'announcement_id', NEW.id,
                'author_name', author_name
            ),
            '/user/announcements?announcement=' || NEW.id
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger to ensure function is attached
DROP TRIGGER IF EXISTS trigger_create_announcement_notifications ON public.announcements;
CREATE TRIGGER trigger_create_announcement_notifications
    AFTER INSERT ON public.announcements
    FOR EACH ROW
    EXECUTE FUNCTION public.create_announcement_notifications();

-- Function to handle announcement email notifications (called via API)
CREATE OR REPLACE FUNCTION public.send_announcement_emails(
    p_announcement_id UUID,
    p_author_name TEXT DEFAULT 'Administrator'
)
RETURNS TABLE(
    success BOOLEAN,
    emails_sent INTEGER,
    errors TEXT[]
) AS $$
DECLARE
    announcement_record RECORD;
    user_record RECORD;
    emails_sent_count INTEGER := 0;
    error_list TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Get announcement details
    SELECT id, title, content, created_by
    INTO announcement_record
    FROM public.announcements
    WHERE id = p_announcement_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0, ARRAY['Announcement not found'];
        RETURN;
    END IF;

    FOR user_record IN 
        SELECT id, email, full_name
        FROM public.profiles
        WHERE status = 'Active' 
        AND email IS NOT NULL
    LOOP
        emails_sent_count := emails_sent_count + 1;
    END LOOP;

    RETURN QUERY SELECT true, emails_sent_count, error_list;
END;
$$ LANGUAGE plpgsql;

-- Helper to fetch email payload
CREATE OR REPLACE FUNCTION public.get_announcement_email_data(
    p_announcement_id UUID
)
RETURNS TABLE(
    announcement_id UUID,
    title TEXT,
    content TEXT,
    author_name TEXT,
    user_id UUID,
    user_email TEXT,
    user_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id as announcement_id,
        a.title,
        a.content,
        COALESCE(p.full_name, 'Administrator') as author_name,
        u.id as user_id,
        u.email as user_email,
        u.full_name as user_name
    FROM public.announcements a
    LEFT JOIN public.profiles p ON a.created_by = p.id
    CROSS JOIN public.profiles u
    WHERE a.id = p_announcement_id
    AND u.status = 'Active'
    AND u.email IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.create_announcement_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_announcement_emails(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_announcement_email_data(UUID) TO authenticated;
