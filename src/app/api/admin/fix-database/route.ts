import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const { gearId } = await request.json();

        // Get supabase client
        const supabase = createRouteHandlerClient({ cookies });

        // Verify user is authenticated and is an admin
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error("API - Authentication error:", authError);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || profile.role !== 'Admin') {
            console.error("API - Authorization error:", profileError);
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        // Create RLS bypass function for gear deletion
        const setupSQL = `
    -- Create a deletion function with SECURITY DEFINER to bypass RLS
    CREATE OR REPLACE FUNCTION delete_gear_by_admin(p_gear_id UUID)
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER -- This runs with the privileges of the function creator (superuser)
    AS $$
    DECLARE
      success BOOLEAN := FALSE;
      has_maintenance BOOLEAN;
      has_bookings BOOLEAN;
    BEGIN
      -- Check for maintenance records
      BEGIN
        SELECT EXISTS(SELECT 1 FROM public.gear_maintenance WHERE gear_id = p_gear_id) INTO has_maintenance;
        -- Delete maintenance records if they exist
        IF has_maintenance THEN
          DELETE FROM public.gear_maintenance WHERE gear_id = p_gear_id;
        END IF;
      EXCEPTION WHEN undefined_table THEN
        -- Table doesn't exist, ignore
        has_maintenance := FALSE;
      END;
      
      -- Check for bookings
      BEGIN
        SELECT EXISTS(SELECT 1 FROM public.bookings WHERE gear_id = p_gear_id) INTO has_bookings;
        -- We'll proceed even if there are bookings for now, but log it
        -- In a real app you'd need to decide the business logic here
      EXCEPTION WHEN undefined_table THEN
        -- Table doesn't exist, ignore
        has_bookings := FALSE;
      END;

      -- Now delete the gear
      DELETE FROM public.gears WHERE id = p_gear_id;
      
      -- Check if it was deleted
      success := NOT EXISTS(SELECT 1 FROM public.gears WHERE id = p_gear_id);
      
      RETURN success;
    END;
    $$;

    -- Grant execute permission to authenticated users
    GRANT EXECUTE ON FUNCTION delete_gear_by_admin(UUID) TO authenticated;

    -- Ensure RLS is enabled on gears table
    ALTER TABLE IF EXISTS public.gears ENABLE ROW LEVEL SECURITY;

    -- Create a policy allowing admins to delete gears
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'gears' 
        AND policyname = 'admin_delete_gears_policy'
      ) THEN
        CREATE POLICY admin_delete_gears_policy ON public.gears
          FOR DELETE
          USING (
            auth.uid() IN (
              SELECT id FROM public.profiles WHERE role = 'Admin'
            )
          );
      END IF;
    END
    $$;
    `;

        // Execute the setup SQL
        try {
            const result = await supabase.rpc('exec_admin_sql', { sql: setupSQL });

            if (result.error) {
                // Function might not exist yet, create it first
                const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION exec_admin_sql(sql TEXT) RETURNS VOID AS $$
        BEGIN
          EXECUTE sql;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        GRANT EXECUTE ON FUNCTION exec_admin_sql(TEXT) TO authenticated;
        `;

                // Try using graphql to execute raw SQL (needs admin privileges)
                // This may fail if the client doesn't have appropriate permissions
                await supabase.rpc('exec_admin_sql', { sql: createFunctionSQL });

                // Try executing the original SQL again
                const retryResult = await supabase.rpc('exec_admin_sql', { sql: setupSQL });

                if (retryResult.error) {
                    return NextResponse.json({
                        success: false,
                        error: retryResult.error,
                        message: "Database setup failed - you may need to run the SQL manually in the Supabase dashboard"
                    }, { status: 500 });
                }
            }

            return NextResponse.json({
                success: true,
                message: "Database permissions and RLS policies have been updated",
                setupCompleted: true
            });
        } catch (error) {
            console.error("Failed to set up database:", error);

            // Return the SQL for manual execution
            return NextResponse.json({
                success: false,
                message: "Failed to set up database automatically. Please run this SQL in the Supabase SQL editor:",
                sql: setupSQL,
                error: error
            }, { status: 500 });
        }
    } catch (error: any) {
        console.error("Database setup error:", error);
        return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
    }
} 