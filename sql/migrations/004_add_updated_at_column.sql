-- Add updated_at column to gears table if it doesn't exist
ALTER TABLE public.gears 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index on updated_at for better performance with sorting and filtering
CREATE INDEX IF NOT EXISTS idx_gears_updated_at ON public.gears(updated_at);

-- Make sure gear statuses are correctly represented
-- Handle NULL or invalid statuses by setting them to 'Available'
UPDATE public.gears
SET status = 'Available'
WHERE status IS NULL OR status = '';

-- Add function to handle automatic timestamps
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp' AND tgrelid = 'public.gears'::regclass) THEN
    CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.gears
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  END IF;
END
$$; 