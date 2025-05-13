-- Database Health Check and Repair Script

-- Function to log checks and repairs
CREATE OR REPLACE FUNCTION log_db_health_check(check_name text, status text, details text DEFAULT NULL)
RETURNS void AS $$
BEGIN
  RAISE NOTICE '% - Status: % %', 
    check_name, 
    status, 
    CASE WHEN details IS NOT NULL THEN '- ' || details ELSE '' END;
END;
$$ LANGUAGE plpgsql;

-- Check gear tables and columns
DO $$
DECLARE
  gear_count int;
  column_count int;
  policy_count int;
BEGIN
  -- Check if gears table exists
  SELECT COUNT(*) INTO gear_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'gears';
  
  IF gear_count = 0 THEN
    PERFORM log_db_health_check('Gears Table', 'MISSING', 'Table does not exist');
  ELSE
    PERFORM log_db_health_check('Gears Table', 'OK', gear_count || ' table found');
    
    -- Check if required columns exist
    SELECT COUNT(*) INTO column_count 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'gears' 
    AND column_name IN ('checked_out_to', 'current_request_id', 'updated_at', 'last_checkout_date', 'due_date');
    
    IF column_count < 5 THEN
      PERFORM log_db_health_check('Gears Columns', 'INCOMPLETE', 'Only ' || column_count || ' of 5 required columns exist');
      
      -- Add any missing columns
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gears' AND column_name = 'checked_out_to') THEN
        ALTER TABLE public.gears ADD COLUMN checked_out_to UUID REFERENCES auth.users(id);
        PERFORM log_db_health_check('Repair', 'ADDED', 'Added checked_out_to column');
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gears' AND column_name = 'current_request_id') THEN
        ALTER TABLE public.gears ADD COLUMN current_request_id UUID;
        PERFORM log_db_health_check('Repair', 'ADDED', 'Added current_request_id column');
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gears' AND column_name = 'updated_at') THEN
        ALTER TABLE public.gears ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        PERFORM log_db_health_check('Repair', 'ADDED', 'Added updated_at column');
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gears' AND column_name = 'last_checkout_date') THEN
        ALTER TABLE public.gears ADD COLUMN last_checkout_date TIMESTAMP WITH TIME ZONE;
        PERFORM log_db_health_check('Repair', 'ADDED', 'Added last_checkout_date column');
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gears' AND column_name = 'due_date') THEN
        ALTER TABLE public.gears ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;
        PERFORM log_db_health_check('Repair', 'ADDED', 'Added due_date column');
      END IF;
    ELSE
      PERFORM log_db_health_check('Gears Columns', 'OK', 'All required columns exist');
    END IF;
    
    -- Check RLS policies
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'gears';
    
    IF policy_count = 0 THEN
      PERFORM log_db_health_check('Gears Policies', 'MISSING', 'No RLS policies found');
      
      -- Create basic policies if missing
      ALTER TABLE public.gears ENABLE ROW LEVEL SECURITY;
      
      -- Allow admins to do anything
      CREATE POLICY admin_all ON public.gears
        FOR ALL
        TO authenticated
        USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'));
      
      -- Allow users to view all gear
      CREATE POLICY users_select ON public.gears
        FOR SELECT
        TO authenticated
        USING (true);
      
      -- Allow users to update their checked out gear
      CREATE POLICY users_update_own ON public.gears
        FOR UPDATE
        TO authenticated
        USING (checked_out_to = auth.uid())
        WITH CHECK (checked_out_to = auth.uid());
        
      PERFORM log_db_health_check('Repair', 'ADDED', 'Created basic RLS policies');
    ELSE
      PERFORM log_db_health_check('Gears Policies', 'OK', policy_count || ' policies found');
    END IF;
  END IF;
  
  -- Check gear_maintenance table
  SELECT COUNT(*) INTO gear_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'gear_maintenance';
  
  IF gear_count = 0 THEN
    PERFORM log_db_health_check('Gear Maintenance Table', 'MISSING', 'Table does not exist');
    
    -- Create the table if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.gear_maintenance (
      id SERIAL PRIMARY KEY,
      gear_id UUID NOT NULL REFERENCES public.gears(id) ON DELETE CASCADE,
      maintenance_type TEXT NOT NULL,
      description TEXT NOT NULL,
      performed_by UUID REFERENCES auth.users(id),
      performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Add permissions
    ALTER TABLE public.gear_maintenance ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'gear_maintenance'
      AND policyname = 'Admins can do anything'
    ) THEN
      CREATE POLICY "Admins can do anything" ON public.gear_maintenance
        FOR ALL TO authenticated
        USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'))
        WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'));
    END IF;
      
    PERFORM log_db_health_check('Repair', 'CREATED', 'Created gear_maintenance table with policies');
  ELSE
    PERFORM log_db_health_check('Gear Maintenance Table', 'OK', 'Table exists');
  END IF;
  
  -- Check gear_checkouts table
  SELECT COUNT(*) INTO gear_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'gear_checkouts';
  
  IF gear_count = 0 THEN
    PERFORM log_db_health_check('Gear Checkouts Table', 'MISSING', 'Table does not exist');
    
    -- Create the table if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.gear_checkouts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      gear_id UUID NOT NULL REFERENCES public.gears(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id),
      request_id UUID,
      checkout_date TIMESTAMP WITH TIME ZONE NOT NULL,
      expected_return_date TIMESTAMP WITH TIME ZONE,
      actual_return_date TIMESTAMP WITH TIME ZONE,
      status TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Add permissions
    ALTER TABLE public.gear_checkouts ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Admins can do anything" ON public.gear_checkouts
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'));
      
    CREATE POLICY "Users can view own checkouts" ON public.gear_checkouts
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
      
    PERFORM log_db_health_check('Repair', 'CREATED', 'Created gear_checkouts table with policies');
  ELSE
    PERFORM log_db_health_check('Gear Checkouts Table', 'OK', 'Table exists');
  END IF;
  
  -- Make sure our update_gear_status function works
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_gear_status' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    PERFORM log_db_health_check('Status Update Function', 'MISSING', 'Function does not exist');
  ELSE
    PERFORM log_db_health_check('Status Update Function', 'OK', 'Function exists');
  END IF;
  
  -- Make sure our triggers are working
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'gear_status_update_trigger' AND tgrelid = 'public.gears'::regclass
  ) THEN
    PERFORM log_db_health_check('Status Update Trigger', 'MISSING', 'Trigger does not exist');
    
    -- Create the trigger
    DROP TRIGGER IF EXISTS gear_status_update_trigger ON public.gears;
    CREATE TRIGGER gear_status_update_trigger
    BEFORE UPDATE ON public.gears
    FOR EACH ROW
    EXECUTE FUNCTION update_gear_status_trigger();
    
    PERFORM log_db_health_check('Repair', 'CREATED', 'Added gear status update trigger');
  ELSE
    PERFORM log_db_health_check('Status Update Trigger', 'OK', 'Trigger exists');
  END IF;
  
  -- Final summary
  PERFORM log_db_health_check('Database Health Check', 'COMPLETE', 'All checks and repairs finished');
END;
$$; 