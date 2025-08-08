-- Fix check-in and gear relationship issues
-- This migration addresses the "Unknown Gear" issue in check-in history
-- and ensures proper data consistency between gears and checkins tables

-- 1. Clean up any checkins that reference non-existent gears
DELETE FROM checkins 
WHERE gear_id NOT IN (SELECT id FROM gears);

-- 2. Clean up any gears that have checked_out_to set but status is Available/Needs Repair
-- This fixes the issue where users see items that need to be checked in but are already approved
UPDATE gears 
SET checked_out_to = NULL, 
    current_request_id = NULL,
    updated_at = NOW()
WHERE status IN ('Available', 'Needs Repair') 
  AND checked_out_to IS NOT NULL;

-- 3. Ensure proper foreign key constraint exists for checkins.gear_id -> gears.id
-- First, drop the existing constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'checkins_gear_id_fkey' 
        AND table_name = 'checkins'
    ) THEN
        ALTER TABLE checkins DROP CONSTRAINT checkins_gear_id_fkey;
    END IF;
END $$;

-- 4. Add the foreign key constraint with proper cascade behavior
ALTER TABLE checkins 
ADD CONSTRAINT checkins_gear_id_fkey 
FOREIGN KEY (gear_id) REFERENCES gears(id) ON DELETE CASCADE;

-- 5. Create an index on checkins.gear_id for better query performance
CREATE INDEX IF NOT EXISTS idx_checkins_gear_id ON checkins(gear_id);

-- 6. Create an index on gears.checked_out_to for better query performance
CREATE INDEX IF NOT EXISTS idx_gears_checked_out_to ON gears(checked_out_to);

-- 7. Add a trigger to automatically update gear status when check-in is approved
CREATE OR REPLACE FUNCTION update_gear_on_checkin_approval()
RETURNS TRIGGER AS $$
BEGIN
    -- When a check-in is approved (status = 'Completed'), update the gear
    IF NEW.status = 'Completed' AND OLD.status != 'Completed' THEN
        UPDATE gears 
        SET status = CASE 
                        WHEN NEW.condition = 'Damaged' THEN 'Needs Repair' 
                        ELSE 'Available' 
                     END,
            checked_out_to = NULL,
            current_request_id = NULL,
            condition = NEW.condition,
            updated_at = NOW()
        WHERE id = NEW.gear_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_gear_on_checkin_approval ON checkins;

-- Create the trigger
CREATE TRIGGER trigger_update_gear_on_checkin_approval
    AFTER UPDATE ON checkins
    FOR EACH ROW
    EXECUTE FUNCTION update_gear_on_checkin_approval();

-- 8. Add a function to get check-in history with proper gear names
CREATE OR REPLACE FUNCTION get_user_checkin_history(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    gear_name TEXT,
    checkin_date TIMESTAMPTZ,
    status TEXT,
    condition TEXT,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        COALESCE(g.name, 'Unknown Gear') as gear_name,
        c.checkin_date,
        c.status,
        c.condition,
        c.notes
    FROM checkins c
    LEFT JOIN gears g ON c.gear_id = g.id
    WHERE c.user_id = user_uuid
    ORDER BY c.checkin_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_checkin_history(UUID) TO authenticated;
