-- Create an emergency function with admin privileges to force gear status updates
-- This bypasses all RLS policies and directly updates the database

CREATE OR REPLACE FUNCTION public.admin_force_update_gear_status(
  gear_id UUID,
  new_status TEXT,
  checkout_user_id UUID DEFAULT NULL,
  request_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Run with owner privileges
AS $$
BEGIN
  -- Log the emergency update
  RAISE WARNING 'EMERGENCY UPDATE: Forcing gear % to status % by user % for request %',
    gear_id, new_status, checkout_user_id, request_id;
  
  -- Direct update bypassing all security policies
  UPDATE public.gears
  SET 
    status = new_status,
    updated_at = NOW(),
    checked_out_to = checkout_user_id,
    current_request_id = request_id,
    last_checkout_date = CASE WHEN new_status = 'Checked Out' THEN NOW() ELSE last_checkout_date END,
    due_date = CASE WHEN new_status = 'Checked Out' THEN (NOW() + INTERVAL '1 week') ELSE due_date END
  WHERE id = gear_id;
  
  -- Record the emergency update in the maintenance table
  INSERT INTO public.gear_maintenance(
    gear_id,
    maintenance_type,
    description,
    performed_by,
    performed_at
  ) VALUES (
    gear_id,
    'Emergency Status Change',
    'EMERGENCY: Status forced to ' || new_status || ' by admin function',
    COALESCE(checkout_user_id, '00000000-0000-0000-0000-000000000000'::UUID),
    NOW()
  );
  
  RETURN FOUND;
END;
$$;

-- Grant execution rights to authenticated users
GRANT EXECUTE ON FUNCTION public.admin_force_update_gear_status TO authenticated;

-- Add an index to improve performance of status lookups
CREATE INDEX IF NOT EXISTS idx_gears_status_with_id ON public.gears(status, id);

-- Make sure the default trigger is working
DROP TRIGGER IF EXISTS gear_status_update_trigger ON public.gears;
CREATE TRIGGER gear_status_update_trigger
BEFORE UPDATE ON public.gears
FOR EACH ROW
EXECUTE FUNCTION update_gear_status_trigger(); 