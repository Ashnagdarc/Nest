-- Remove old trigger that checked out entire gear_ids on approval
DROP TRIGGER IF EXISTS trigger_update_gears_on_request_approval ON public.gear_requests;
-- Keep function if used elsewhere, otherwise drop it safely
-- DROP FUNCTION IF EXISTS public.update_gears_on_request_approval();

