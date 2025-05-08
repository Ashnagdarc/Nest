-- Create a function to generate notifications for all users when a new announcement is posted

CREATE OR REPLACE FUNCTION create_announcement_notifications()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user record;
    v_announcement_title text;
    v_announcement_excerpt text;
BEGIN
    -- Get a safe excerpt of the announcement content (first 50 chars)
    v_announcement_title := NEW.title;
    v_announcement_excerpt := substring(NEW.content from 1 for 50);
    IF length(NEW.content) > 50 THEN
        v_announcement_excerpt := v_announcement_excerpt || '...';
    END IF;
    
    -- Create a notification for each active user
    FOR v_user IN
        SELECT id FROM profiles WHERE status = 'active'
    LOOP
        INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            read,
            link,
            created_at
        ) VALUES (
            v_user.id,
            'system',
            'New Announcement',
            v_announcement_title || ': ' || v_announcement_excerpt,
            false,
            '/announcements',
            NEW.created_at
        );
    END LOOP;
    
    RETURN NEW;
END;
$$;

-- Create trigger to fire the function after an announcement is inserted
DROP TRIGGER IF EXISTS trigger_create_announcement_notifications ON announcements;

CREATE TRIGGER trigger_create_announcement_notifications
AFTER INSERT ON announcements
FOR EACH ROW
EXECUTE FUNCTION create_announcement_notifications(); 