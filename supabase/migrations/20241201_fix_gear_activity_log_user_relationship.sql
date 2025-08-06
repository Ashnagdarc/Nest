-- Migration to fix conflicting foreign key constraints on gear_activity_log.user_id
-- This resolves the "more than one relationship" error

-- Drop conflicting foreign key constraints
ALTER TABLE public.gear_activity_log 
DROP CONSTRAINT IF EXISTS fk_gear_activity_user;

ALTER TABLE public.gear_activity_log 
DROP CONSTRAINT IF EXISTS gear_activity_log_user_id_fkey;

-- Add the correct single foreign key constraint to auth.users
ALTER TABLE public.gear_activity_log 
ADD CONSTRAINT gear_activity_log_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL; 