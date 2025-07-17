-- Migration for gear_maintenance table
-- Creates the maintenance records table for tracking gear maintenance history

-- Check if table exists first to avoid errors on re-runs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'gear_maintenance'
  ) THEN
    -- Create the gear_maintenance table
    CREATE TABLE public.gear_maintenance (
      id SERIAL PRIMARY KEY,
      gear_id UUID NOT NULL REFERENCES public.gears(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'Maintenance', -- 'Maintenance', 'Damage Report', etc.
      issue_description TEXT,
      resolution TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      user_id UUID REFERENCES auth.users(id),
      completed_at TIMESTAMP WITH TIME ZONE
    );

    -- Add comment to table
    COMMENT ON TABLE public.gear_maintenance IS 'Records maintenance and damage reports for equipment';

    -- Enable RLS
    ALTER TABLE public.gear_maintenance ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Admins can do anything" ON public.gear_maintenance
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'));
    
    CREATE POLICY "Users can view maintenance records" ON public.gear_maintenance
      FOR SELECT TO authenticated
      USING (true);
    
    CREATE POLICY "Users can create damage reports" ON public.gear_maintenance
      FOR INSERT TO authenticated
      WITH CHECK (type = 'Damage Report');
  END IF;
END $$; 