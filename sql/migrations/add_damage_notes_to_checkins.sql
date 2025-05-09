-- Add damage_notes column to checkins table
ALTER TABLE public.checkins
ADD COLUMN IF NOT EXISTS damage_notes TEXT;

-- Add comment explaining column usage
COMMENT ON COLUMN public.checkins.damage_notes IS 'Description of any damage reported during check-in';

-- Refresh the schema cache to ensure PostgREST picks up the changes
NOTIFY pgrst, 'reload schema'; 