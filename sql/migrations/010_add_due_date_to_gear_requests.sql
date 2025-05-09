-- Add due_date column to gear_requests table
ALTER TABLE public.gear_requests 
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;

-- Add comment explaining column usage
COMMENT ON COLUMN public.gear_requests.due_date IS 'The date when the gear is expected to be returned';

-- Create an index for due date queries
CREATE INDEX IF NOT EXISTS idx_gear_requests_due_date ON public.gear_requests(due_date);

-- Update existing requests with a default due date (7 days from creation)
UPDATE public.gear_requests
SET due_date = created_at + INTERVAL '7 days'
WHERE due_date IS NULL AND status IN ('Approved', 'Checked Out');

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE 'Added due_date column to gear_requests table';
END $$; 