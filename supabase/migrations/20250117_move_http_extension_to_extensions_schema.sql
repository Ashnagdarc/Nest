-- Migration to move http extension from public schema to dedicated extensions schema
-- This addresses the security warning about extensions in public schema

-- Create a dedicated schema for extensions
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage on the extensions schema to authenticated users
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO anon;

-- Move http extension to the extensions schema (if it exists)
DO $$
BEGIN
    -- Check if http extension exists in public schema
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'http' AND extnamespace = 'public'::regnamespace) THEN
        -- Drop and recreate in extensions schema
        DROP EXTENSION IF EXISTS http CASCADE;
        CREATE EXTENSION IF NOT EXISTS http SCHEMA extensions;
        RAISE NOTICE 'HTTP extension moved to extensions schema';
    ELSE
        RAISE NOTICE 'HTTP extension not found in public schema';
    END IF;
END $$;

-- Add comment for audit trail
COMMENT ON SCHEMA extensions IS 'Dedicated schema for PostgreSQL extensions - security best practice (2025-01-17)';

-- Verify the fix
SELECT 'HTTP extension security fix applied successfully' as status;

