DELETE FROM push_notification_queue
WHERE status = 'failed'
  AND created_at < NOW() - INTERVAL '30 days';