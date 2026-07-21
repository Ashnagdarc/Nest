-- Allow admins to enqueue push notifications for other users (server-side flows).
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.push_notification_queue;

CREATE POLICY "push_queue_insert_self_or_admin"
  ON public.push_notification_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR private.is_admin(auth.uid())
  );

-- Announcement trigger must bypass RLS to fan out notifications to all users.
CREATE OR REPLACE FUNCTION public.create_announcement_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    user_record RECORD;
    author_name TEXT;
BEGIN
    SELECT full_name INTO author_name
    FROM public.profiles
    WHERE id = NEW.created_by;

    IF author_name IS NULL THEN
        author_name := 'Administrator';
    END IF;

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
$$;
