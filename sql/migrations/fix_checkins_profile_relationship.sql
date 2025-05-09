-- First, remove the existing foreign key constraint
ALTER TABLE public.checkins DROP CONSTRAINT IF EXISTS checkins_user_id_fkey;

-- Add the new foreign key constraint to reference profiles instead of auth.users
ALTER TABLE public.checkins
  ADD CONSTRAINT checkins_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Refresh the schema cache to ensure PostgREST picks up the changes
NOTIFY pgrst, 'reload schema';

-- Create a policy to allow users to view their own check-ins
CREATE POLICY IF NOT EXISTS "Users can view their own check-ins"
ON public.checkins
FOR SELECT
USING (auth.uid() = user_id);

-- Create a policy to allow admins to view all check-ins
CREATE POLICY IF NOT EXISTS "Admins can view all check-ins"
ON public.checkins
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'Admin'
  )
);

-- Create an index on user_id for better join performance
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON public.checkins(user_id); 