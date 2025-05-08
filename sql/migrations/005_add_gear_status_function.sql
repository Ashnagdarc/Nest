-- Create a function to update gear status with proper permissions
CREATE OR REPLACE FUNCTION public.update_gear_status(
  p_gear_id UUID,
  p_new_status TEXT,
  p_user_id UUID DEFAULT NULL,
  p_request_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- This is important - runs with definer's permissions
AS $$
DECLARE
  v_success BOOLEAN := FALSE;
BEGIN
  -- Log the function call for debugging
  RAISE NOTICE 'Updating gear % to status % for user % request %', 
    p_gear_id, p_new_status, p_user_id, p_request_id;
  
  -- Update gear status
  UPDATE public.gears
  SET 
    status = p_new_status,
    updated_at = NOW(),
    checked_out_to = CASE 
      WHEN p_new_status = 'Checked Out' THEN p_user_id
      ELSE NULL
    END,
    current_request_id = CASE 
      WHEN p_new_status = 'Checked Out' THEN p_request_id
      ELSE NULL
    END,
    last_checkout_date = CASE 
      WHEN p_new_status = 'Checked Out' THEN NOW()
      ELSE last_checkout_date
    END,
    due_date = CASE 
      WHEN p_new_status = 'Checked Out' THEN (NOW() + INTERVAL '1 week')
      ELSE NULL
    END
  WHERE id = p_gear_id;

  -- Check if update was successful
  IF FOUND THEN
    v_success := TRUE;
    
    -- Add maintenance record manually since the trigger might fail
    INSERT INTO public.gear_maintenance (
      gear_id,
      maintenance_type,
      description,
      performed_by,
      performed_at
    ) VALUES (
      p_gear_id,
      'Status Change',
      'Status changed to ' || p_new_status,
      COALESCE(p_user_id, '00000000-0000-0000-0000-000000000000'::UUID),
      NOW()
    );
  END IF;

  RETURN v_success;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_gear_status TO authenticated;

-- Create a function to get the current user's permissions
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(v_role, 'unknown');
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_role TO authenticated; 