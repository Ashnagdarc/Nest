-- Add condition column to gears table
ALTER TABLE public.gears 
ADD COLUMN IF NOT EXISTS condition TEXT;

-- Create an index for condition lookups
CREATE INDEX IF NOT EXISTS idx_gears_condition ON public.gears(condition);

-- Update the update_gear_status function to handle condition
CREATE OR REPLACE FUNCTION public.update_gear_status(
  p_gear_id UUID,
  p_new_status TEXT,
  p_user_id UUID DEFAULT NULL,
  p_request_id UUID DEFAULT NULL,
  p_condition TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_success BOOLEAN := FALSE;
BEGIN
  -- Update gear status and condition
  UPDATE public.gears
  SET 
    status = p_new_status,
    condition = COALESCE(p_condition, condition),
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
    
    -- Add maintenance record
    INSERT INTO public.gear_maintenance (
      gear_id,
      maintenance_type,
      description,
      performed_by,
      performed_at
    ) VALUES (
      p_gear_id,
      'Status Change',
      'Status changed to ' || p_new_status || CASE 
        WHEN p_condition IS NOT NULL THEN ' with condition: ' || p_condition
        ELSE ''
      END,
      COALESCE(p_user_id, '00000000-0000-0000-0000-000000000000'::UUID),
      NOW()
    );
  END IF;

  RETURN v_success;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_gear_status TO authenticated; 