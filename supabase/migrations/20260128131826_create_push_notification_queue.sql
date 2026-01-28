-- Create push notification queue table
CREATE TABLE IF NOT EXISTS push_notification_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    data JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_push_queue_status_created ON push_notification_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_push_queue_user_id ON push_notification_queue(user_id);

-- Add RLS policies
ALTER TABLE push_notification_queue ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own notifications
CREATE POLICY "Users can insert their own notifications" ON push_notification_queue
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow service role to manage all notifications (for the worker)
CREATE POLICY "Service role can manage all notifications" ON push_notification_queue
    FOR ALL USING (auth.role() = 'service_role');