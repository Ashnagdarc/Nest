-- Test the gear status update function with a specific gear

-- First, let's get a gear ID to test with 
SELECT id, name, status FROM public.gears WHERE status = 'Available' LIMIT 1;

-- Copy the ID from above and use it here (replace the UUID below)
-- Run this query and check if the gear status changes to "Checked Out"
SELECT public.update_gear_status(
  '00000000-0000-0000-0000-000000000000', -- replace with actual gear ID
  'Checked Out',
  (SELECT id FROM public.profiles WHERE role = 'Admin' LIMIT 1),
  NULL
);

-- Verify the change
SELECT id, name, status, checked_out_to, updated_at 
FROM public.gears 
WHERE id = '00000000-0000-0000-0000-000000000000'; -- replace with the same gear ID

-- Also check if a maintenance record was created
SELECT * FROM public.gear_maintenance 
WHERE gear_id = '00000000-0000-0000-0000-000000000000' -- replace with the same gear ID
ORDER BY created_at DESC
LIMIT 1; 