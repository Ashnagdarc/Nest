import { createClient } from '../src/lib/supabase/client';
import { setupRpcFunctions, verifyAndFixGearsTable, ensureExecSqlFunctionExists, createGearFunctionsSQL } from '../src/lib/utils/supabase-utils';

async function verifyAllTables() {
    const supabase = createClient();
    const sql = `
    -- Create essential tables if they don't exist
    
    -- Gear Maintenance Table
    CREATE TABLE IF NOT EXISTS public.gear_maintenance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gear_id UUID REFERENCES public.gears(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        description TEXT NOT NULL,
        date TIMESTAMPTZ NOT NULL,
        performed_by UUID REFERENCES auth.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Notifications Table
    CREATE TABLE IF NOT EXISTS public.notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        link TEXT,
        metadata JSONB
    );

    -- App Settings Table
    CREATE TABLE IF NOT EXISTS public.app_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key TEXT UNIQUE NOT NULL,
        value JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Enable RLS on all tables
    ALTER TABLE IF EXISTS public.gear_maintenance ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.app_settings ENABLE ROW LEVEL SECURITY;

    -- Create essential indices
    CREATE INDEX IF NOT EXISTS idx_gear_maintenance_gear_id ON gear_maintenance(gear_id);
    CREATE INDEX IF NOT EXISTS idx_gear_maintenance_date ON gear_maintenance(date);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

    -- Update existing tables with any missing columns
    DO $$ 
    BEGIN
        -- Add updated_at to tables if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'gear_maintenance' AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE gear_maintenance ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'metadata'
        ) THEN
            ALTER TABLE notifications ADD COLUMN metadata JSONB;
        END IF;
    END $$;`;

    try {
        const { error } = await supabase.rpc('exec_sql', { sql });
        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Error verifying tables:', err);
        return false;
    }
}

// Set up environment variables
import dotenv from 'dotenv';
dotenv.config();

async function verifySchema() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('Missing required environment variables. Please check your .env file.');
        process.exit(1);
    }
    console.log('Starting schema verification...');

    // First ensure we have the exec_sql function available
    console.log('\n1. Checking exec_sql function...');
    const hasExecSql = await ensureExecSqlFunctionExists();
    if (!hasExecSql) {
        console.error('Failed to ensure exec_sql function exists');
        process.exit(1);
    }

    // Verify all tables
    console.log('\n2. Verifying all tables...');
    const allTablesVerified = await verifyAllTables();
    if (!allTablesVerified) {
        console.error('Failed to verify all tables');
        process.exit(1);
    }

    // Then verify the gears table structure specifically
    console.log('\n3. Verifying gears table structure...');
    const gearsVerified = await verifyAndFixGearsTable();
    if (!gearsVerified) {
        console.error('Failed to verify gears table structure');
        process.exit(1);
    }

    // Set up RPC functions
    console.log('\n4. Setting up RPC functions...');
    await setupRpcFunctions();

    // Create gear functions if needed
    console.log('\n5. Creating gear functions...');
    const gearFunctionsCreated = await createGearFunctionsSQL();
    if (!gearFunctionsCreated) {
        console.error('Failed to create gear functions');
        process.exit(1);
    }

    console.log('\nSchema verification completed successfully!');
}

verifySchema().catch(console.error);
