-- First rename 'date' to 'performed_at' if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'gear_maintenance' 
    AND column_name = 'date'
  ) THEN
    ALTER TABLE public.gear_maintenance RENAME COLUMN date TO performed_at;
  END IF;
END $$;

-- Add maintenance_type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'gear_maintenance' 
    AND column_name = 'maintenance_type'
  ) THEN
    ALTER TABLE public.gear_maintenance ADD COLUMN maintenance_type TEXT;
    
    -- Update existing records to have a default maintenance_type based on status
    UPDATE public.gear_maintenance
    SET maintenance_type = CASE 
      WHEN status = 'Damaged' THEN 'Damage Report'
      WHEN status = 'Under Repair' THEN 'Repair'
      ELSE 'Status Change'
    END;
    
    -- Make the column NOT NULL after populating data
    ALTER TABLE public.gear_maintenance ALTER COLUMN maintenance_type SET NOT NULL;
  END IF;
END $$;

-- Create index on maintenance_type for better query performance
CREATE INDEX IF NOT EXISTS idx_gear_maintenance_type ON public.gear_maintenance(maintenance_type);

-- Create index on performed_at for better date range queries
CREATE INDEX IF NOT EXISTS idx_gear_maintenance_performed_at ON public.gear_maintenance(performed_at);

-- Update the gear_maintenance table comment
COMMENT ON TABLE public.gear_maintenance IS 'Tracks all maintenance activities and status changes for gear items';

-- Add column comments
COMMENT ON COLUMN public.gear_maintenance.id IS 'Primary key';
COMMENT ON COLUMN public.gear_maintenance.gear_id IS 'Reference to the gear item';
COMMENT ON COLUMN public.gear_maintenance.maintenance_type IS 'Type of maintenance (Status Change, Damage Report, Repair, etc)';
COMMENT ON COLUMN public.gear_maintenance.status IS 'Current status of the maintenance activity';
COMMENT ON COLUMN public.gear_maintenance.description IS 'Detailed description of the maintenance or status change';
COMMENT ON COLUMN public.gear_maintenance.performed_at IS 'When the maintenance was performed';
COMMENT ON COLUMN public.gear_maintenance.performed_by IS 'User who performed the maintenance';
COMMENT ON COLUMN public.gear_maintenance.created_at IS 'Record creation timestamp'; 