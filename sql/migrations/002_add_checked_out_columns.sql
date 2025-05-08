-- Add checked_out_to and related columns to the gears table
ALTER TABLE public.gears 
ADD COLUMN IF NOT EXISTS checked_out_to UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS current_request_id UUID,
ADD COLUMN IF NOT EXISTS last_checkout_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gears_checked_out_to ON public.gears(checked_out_to) WHERE checked_out_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gears_current_request_id ON public.gears(current_request_id) WHERE current_request_id IS NOT NULL;

-- Add comment explaining column usage
COMMENT ON COLUMN public.gears.checked_out_to IS 'References the user who currently has this gear checked out';
COMMENT ON COLUMN public.gears.current_request_id IS 'References the current active request for this gear';
COMMENT ON COLUMN public.gears.last_checkout_date IS 'The date when the gear was last checked out';
COMMENT ON COLUMN public.gears.due_date IS 'The date when the gear is due to be returned'; 