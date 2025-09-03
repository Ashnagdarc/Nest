-- Remove redundant fields from gears table
DO $$
BEGIN
    -- Drop redundant columns one by one
    -- We keep the columns that are part of the core gear data
    ALTER TABLE public.gears
        DROP COLUMN IF EXISTS checked_out_by,
        DROP COLUMN IF EXISTS initial_condition,
        DROP COLUMN IF EXISTS status,
        DROP COLUMN IF EXISTS checked_out_to,
        DROP COLUMN IF EXISTS current_request_id,
        DROP COLUMN IF EXISTS last_checkout_date,
        DROP COLUMN IF EXISTS due_date;

    -- Add NOT NULL constraint to quantity if not already present
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gears' 
        AND column_name = 'quantity' 
        AND is_nullable = 'YES'
    ) THEN
        -- First set default value for any NULL quantities
        UPDATE public.gears SET quantity = 1 WHERE quantity IS NULL;
        -- Then add NOT NULL constraint
        ALTER TABLE public.gears ALTER COLUMN quantity SET NOT NULL;
    END IF;

    -- Add default value to quantity if not already present
    ALTER TABLE public.gears ALTER COLUMN quantity SET DEFAULT 1;

    -- Ensure timestamps have default values
    ALTER TABLE public.gears ALTER COLUMN created_at SET DEFAULT NOW();
    ALTER TABLE public.gears ALTER COLUMN updated_at SET DEFAULT NOW();
END $$;
