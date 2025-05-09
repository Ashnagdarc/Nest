-- Function to delete a user and all related data
CREATE OR REPLACE FUNCTION public.delete_user_cascade(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete user's checkins
    DELETE FROM public.checkins
    WHERE user_id = p_user_id;

    -- Delete user's checkouts
    DELETE FROM public.gear_checkouts
    WHERE user_id = p_user_id;

    -- Delete user's notifications
    DELETE FROM public.notifications
    WHERE user_id = p_user_id;

    -- Delete user's requests
    DELETE FROM public.gear_requests
    WHERE user_id = p_user_id;

    -- Finally, delete the user's profile
    DELETE FROM public.profiles
    WHERE id = p_user_id;

    -- Note: The actual auth.users deletion will be handled by the Edge Function
END;
$$; 