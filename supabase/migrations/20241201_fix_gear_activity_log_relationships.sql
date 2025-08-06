-- Migration to fix gear_activity_log foreign key relationships
-- This resolves the "more than one relationship" error

-- Add explicit foreign key constraints to gear_activity_log table
DO $$
BEGIN
    -- Check if gear_activity_log.gear_id foreign key exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'gear_activity_log_gear_id_fkey' 
        AND table_name = 'gear_activity_log'
    ) THEN
        -- Add foreign key constraint for gear_id
        ALTER TABLE public.gear_activity_log 
        ADD CONSTRAINT gear_activity_log_gear_id_fkey 
        FOREIGN KEY (gear_id) REFERENCES public.gears(id) ON DELETE SET NULL;
    END IF;

    -- Check if gear_activity_log.user_id foreign key exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'gear_activity_log_user_id_fkey' 
        AND table_name = 'gear_activity_log'
    ) THEN
        -- Add foreign key constraint for user_id
        ALTER TABLE public.gear_activity_log 
        ADD CONSTRAINT gear_activity_log_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    -- Check if gear_activity_log.request_id foreign key exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'gear_activity_log_request_id_fkey' 
        AND table_name = 'gear_activity_log'
    ) THEN
        -- Add foreign key constraint for request_id
        ALTER TABLE public.gear_activity_log 
        ADD CONSTRAINT gear_activity_log_request_id_fkey 
        FOREIGN KEY (request_id) REFERENCES public.gear_requests(id) ON DELETE SET NULL;
    END IF;
END $$; 