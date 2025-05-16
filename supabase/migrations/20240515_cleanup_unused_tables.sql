set check_function_bodies = off;

-- First check if the tables exist
do $$
declare
    v_exists boolean;
begin
    -- Check for announcements_backup
    select exists (
        select from information_schema.tables 
        where table_schema = 'public' 
        and table_name = 'announcements_backup'
    ) into v_exists;
    
    if v_exists then
        raise notice 'Dropping announcements_backup table...';
        execute 'DROP TABLE IF EXISTS public.announcements_backup';
    end if;

    -- Check for admin_reports_data
    select exists (
        select from information_schema.tables 
        where table_schema = 'public' 
        and table_name = 'admin_reports_data'
    ) into v_exists;
    
    if v_exists then
        raise notice 'Dropping admin_reports_data table...';
        execute 'DROP TABLE IF EXISTS public.admin_reports_data';
    end if;

    -- Check for gear_calendar_bookings_with_profiles table
    select exists (
        select from information_schema.tables 
        where table_schema = 'public' 
        and table_name = 'gear_calendar_bookings_with_profiles'
    ) into v_exists;
    
    if v_exists then
        raise notice 'Converting gear_calendar_bookings_with_profiles to view...';
        -- Create the view first (if table exists, it will fail, that's ok)
        begin
            execute '
                CREATE OR REPLACE VIEW public.gear_calendar_bookings_with_profiles AS
                SELECT 
                    b.*,
                    g.name as gear_name,
                    p.full_name as user_full_name,
                    p.email as user_email
                FROM public.gear_calendar_bookings b
                JOIN public.gears g ON b.gear_id = g.id
                JOIN public.profiles p ON b.user_id = p.id
            ';
            -- If we get here, view was created successfully
            execute 'DROP TABLE IF EXISTS public.gear_calendar_bookings_with_profiles';
        exception when others then
            raise notice 'Error creating view: %', sqlerrm;
        end;
    end if;
end $$;
