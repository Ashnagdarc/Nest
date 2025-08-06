-- Fix gear_activity_log foreign key relationships
-- This migration adds explicit foreign key constraints to resolve the "more than one relationship" error

-- First, check if foreign key constraints already exist
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

-- Verify the constraints were added
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'gear_activity_log'; 