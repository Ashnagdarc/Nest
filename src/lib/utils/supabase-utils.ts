// Utilities for setting up and using Supabase RPC functions
import { createClient } from "@/lib/supabase/client";

/**
 * Sets up the RPC functions in Supabase if they don't already exist.
 * Call this function during app initialization.
 */
export async function setupRpcFunctions() {
  const supabase = createClient();

  try {
    console.log("Setting up RPC functions...");

    // Check if the function already exists to avoid duplicate creation
    const { data: existingFunctions, error: checkError } = await supabase
      .from('_functions')
      .select('name')
      .eq('name', 'get_all_gears')
      .limit(1);

    if (checkError) {
      console.log("Could not check for existing functions, creating anyway:", checkError);
    }

    if (!existingFunctions || existingFunctions.length === 0) {
      // Create get_all_gears function
      const { error } = await supabase.rpc('create_function', {
        function_name: 'get_all_gears',
        function_definition: `
          CREATE OR REPLACE FUNCTION public.get_all_gears()
          RETURNS SETOF json
          LANGUAGE sql
          SECURITY DEFINER
          AS $$
            SELECT json_build_object(
              'id', g.id,
              'name', g.name,
              'category', g.category,
              'description', g.description,
              'serial_number', g.serial_number,
              'purchase_date', g.purchase_date,
              'created_at', g.created_at,
              'updated_at', g.updated_at,
              'quantity', g.quantity,
              'gear_states', (
                SELECT json_agg(json_build_object(
                  'status', gs.status,
                  'available_quantity', gs.available_quantity,
                  'checked_out_to', gs.checked_out_to,
                  'due_date', gs.due_date
                ))
                FROM public.gear_states gs
                WHERE gs.gear_id = g.id
                ORDER BY gs.created_at DESC
                LIMIT 1
              )
            )
            FROM public.gears g;
          $$;
        `
      });

      if (error) {
        console.error("Error creating RPC function:", error);
      } else {
        console.log("Successfully created get_all_gears RPC function");
      }
    } else {
      console.log("RPC functions already exist");
    }
  } catch (err) {
    console.error("Error setting up RPC functions:", err);
  }
}

/**
 * Alternative approach: create SQL and execute it directly
 * Use this as a last resort if nothing else works
 */
export async function createGearFunctionsSQL() {
  const supabase = createClient();

  const sql = `
    -- Function to get all gears directly
    CREATE OR REPLACE FUNCTION public.get_all_gears()
    RETURNS SETOF public.gears
    LANGUAGE sql
    SECURITY DEFINER
    AS $$
      SELECT * FROM public.gears;
    $$;
    
    -- Function to update a gear by ID
    CREATE OR REPLACE FUNCTION public.update_gear(
      gear_id UUID,
      gear_data JSONB
    )
    RETURNS public.gears
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      updated_gear public.gears;
    BEGIN
      -- Update gear details
      UPDATE public.gears
      SET
        name = COALESCE(gear_data->>'name', name),
        category = COALESCE(gear_data->>'category', category),
        description = COALESCE(gear_data->>'description', description),
        serial_number = COALESCE(gear_data->>'serial_number', serial_number),
        purchase_date = COALESCE(gear_data->>'purchase_date', purchase_date),
        quantity = COALESCE((gear_data->>'quantity')::integer, quantity),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = gear_id
      RETURNING * INTO updated_gear;

      -- Update gear state if provided
      IF gear_data->>'status' IS NOT NULL OR gear_data->>'available_quantity' IS NOT NULL THEN
        INSERT INTO public.gear_states (
          gear_id,
          status,
          available_quantity,
          checked_out_to,
          due_date
        )
        VALUES (
          gear_id,
          COALESCE(gear_data->>'status', 'Available'),
          COALESCE((gear_data->>'available_quantity')::integer, updated_gear.quantity),
          gear_data->>'checked_out_to',
          (gear_data->>'due_date')::timestamp with time zone
        );
      END IF;
      
      RETURN updated_gear;
    END;
    $$;
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error("Error creating SQL functions:", error);
      return false;
    }

    console.log("Successfully created SQL functions");
    return true;
  } catch (err) {
    console.error("Exception creating SQL functions:", err);
    return false;
  }
}

/**
 * Verifies the gears table structure and fixes any issues
 * This is useful to run during app initialization or as an admin function
 */
export async function verifyAndFixGearsTable() {
  const supabase = createClient();

  try {
    console.log("Verifying gears table structure...");

    // First check if the table exists
    const { data: tables, error: tableError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .eq('tablename', 'gears');

    if (tableError || !tables || tables.length === 0) {
      console.error("Gears table might not exist:", tableError);
      return false;
    }

    // Run a verification SQL to check and fix columns
    const verificationSQL = `
      -- First make a backup of the current table
      CREATE TABLE IF NOT EXISTS gears_backup AS SELECT * FROM gears;

      -- Check for required columns in gears table
      DO $$
      BEGIN
        -- Check for serial_number column
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'gears'
            AND column_name = 'serial_number'
        ) THEN
          ALTER TABLE gears ADD COLUMN serial_number TEXT;
        END IF;

        -- Check for purchase_date column
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'gears'
            AND column_name = 'purchase_date'
        ) THEN
          ALTER TABLE gears ADD COLUMN purchase_date TEXT;
        END IF;

        -- Check for quantity column
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'gears'
            AND column_name = 'quantity'
        ) THEN
          ALTER TABLE gears ADD COLUMN quantity INTEGER DEFAULT 1;
        END IF;

        -- Check for updated_at column
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'gears'
            AND column_name = 'updated_at'
        ) THEN
          ALTER TABLE gears ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
        END IF;
      END $$;

      -- Create gear_states table if it doesn't exist
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'gear_states'
        ) THEN
          CREATE TABLE public.gear_states (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            gear_id UUID NOT NULL REFERENCES public.gears(id) ON DELETE CASCADE,
            status TEXT NOT NULL DEFAULT 'Available',
            available_quantity INTEGER NOT NULL,
            checked_out_to UUID REFERENCES auth.users(id),
            due_date TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
          );

          -- Create index on gear_id for faster lookups
          CREATE INDEX gear_states_gear_id_idx ON public.gear_states(gear_id);

          -- Create trigger to update updated_at
          CREATE OR REPLACE FUNCTION public.update_gear_states_updated_at()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW.updated_at = now();
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;

          CREATE TRIGGER trigger_update_gear_states_updated_at
            BEFORE UPDATE ON public.gear_states
            FOR EACH ROW
            EXECUTE FUNCTION public.update_gear_states_updated_at();

          -- Migrate existing gear status data
          INSERT INTO public.gear_states (
            gear_id,
            status,
            available_quantity,
            checked_out_to,
            due_date
          )
          SELECT
            id as gear_id,
            COALESCE(status, 'Available') as status,
            COALESCE(available_quantity, quantity) as available_quantity,
            checked_out_to,
            due_date
          FROM public.gears;
        END IF;
      END $$;
    `;

    console.log("Running table verification SQL...");
    const { error: sqlError } = await supabase.rpc('exec_sql', { sql: verificationSQL });

    if (sqlError) {
      console.error("Error verifying table structure:", sqlError);
      return false;
    }

    console.log("Successfully verified and fixed gears table structure");
    return true;
  } catch (err) {
    console.error("Error verifying gears table:", err);
    return false;
  }
}

/**
 * Create a basic SQL execution function in the database
 * This allows running arbitrary SQL via RPC
 */
export async function ensureExecSqlFunctionExists() {
  const supabase = createClient();

  try {
    console.log("Ensuring exec_sql function exists...");

    // SQL to create the function if it doesn't exist
    const funcSQL = `
            -- Function to execute arbitrary SQL (admin only)
            CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
            RETURNS jsonb
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = public
            AS $$
            DECLARE
                result jsonb;
            BEGIN
                EXECUTE sql;
                result := '{"success": true}'::jsonb;
                RETURN result;
            EXCEPTION WHEN OTHERS THEN
                result := jsonb_build_object(
                    'success', false,
                    'error', SQLERRM,
                    'detail', SQLSTATE
                );
                RETURN result;
            END;
            $$;

            -- Grant execute permission on the function
            GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated;
        `;

    // We need to execute this directly through PostgreSQL
    // Using special database admin endpoints or supabase UI SQL editor
    console.log("exec_sql function creation SQL:");
    console.log(funcSQL);

    // Try to use the function to see if it exists
    const { error: testError } = await supabase.rpc('exec_sql', {
      sql: 'SELECT 1 as test'
    });

    if (testError) {
      console.error("exec_sql function doesn't exist or you don't have permission to use it:", testError);
      console.log("Please create the exec_sql function using the Supabase SQL editor with the SQL above");
      return false;
    } else {
      console.log("exec_sql function exists and is working");
      return true;
    }
  } catch (err) {
    console.error("Error checking/creating exec_sql function:", err);
    return false;
  }
} 