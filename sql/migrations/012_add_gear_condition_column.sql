-- Add condition column to gears table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gears' 
        AND column_name = 'condition'
    ) THEN 
        ALTER TABLE public.gears ADD COLUMN condition TEXT;
    END IF;
END $$;

-- Create an index for condition lookups
CREATE INDEX IF NOT EXISTS idx_gears_condition ON public.gears(condition);

-- Update RLS policies to include condition
CREATE POLICY IF NOT EXISTS "Users can view gear condition" 
    ON public.gears
    FOR SELECT
    TO authenticated
    USING (true);

-- Grant permissions
ALTER TABLE public.gears ENABLE ROW LEVEL SECURITY;

-- Update existing gears to have a default condition if null
UPDATE public.gears 
SET condition = 'Good' 
WHERE condition IS NULL; 