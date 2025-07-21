-- Enable http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http;

-- Create function to call notification webhook
CREATE OR REPLACE FUNCTION notify_gear_request_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Call the notification trigger API
    PERFORM net.http_post(
        url := 'https://nestbyeden.app/api/notifications/trigger'::text,
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

-- Create trigger for gear_requests table
DROP TRIGGER IF EXISTS trigger_notify_gear_requests ON gear_requests;
CREATE TRIGGER trigger_notify_gear_requests
    AFTER INSERT OR UPDATE ON gear_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_gear_request_changes();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres, service_role;
GRANT EXECUTE ON FUNCTION net.http_post TO postgres, service_role; 