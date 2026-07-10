-- Point database notification webhook at the canonical production domain.
CREATE OR REPLACE FUNCTION notify_gear_request_changes()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM net.http_post(
        url := 'https://www.nestbyeden.app/api/notifications/trigger'::text,
        body := json_build_object(
            'type', TG_OP,
            'table', TG_TABLE_NAME,
            'record', CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE row_to_json(NEW) END,
            'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
        )::jsonb,
        params := '{}'::jsonb,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        timeout_milliseconds := 5000
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
