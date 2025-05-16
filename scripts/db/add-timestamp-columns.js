#!/usr/bin/env node

/**
 * Add Timestamp Columns
 * 
 * This script adds created_at and updated_at timestamp columns to all tables
 * that don't already have them. This ensures the polling fallback mechanism for
 * Realtime subscriptions will work properly.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY are defined in your .env file.');
    process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

async function main() {
    console.log('🔍 Checking tables for missing timestamp columns...');

    try {
        // Get all tables in the public schema
        const { data: tables, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .not('table_name', 'like', 'pg_%');

        if (tablesError) {
            console.error('❌ Error fetching tables:', tablesError.message);
            process.exit(1);
        }

        console.log(`\n✅ Found ${tables.length} tables to check.`);

        let tablesUpdated = 0;
        const tableResults = [];

        // Process each table
        for (const tableObj of tables) {
            const tableName = tableObj.table_name;
            let updated = false;
            let message = '';

            // Check if created_at column exists
            const { data: createdAtExists, error: createdAtError } = await supabase
                .from('information_schema.columns')
                .select('column_name')
                .eq('table_schema', 'public')
                .eq('table_name', tableName)
                .eq('column_name', 'created_at')
                .single();

            // Check if updated_at column exists
            const { data: updatedAtExists, error: updatedAtError } = await supabase
                .from('information_schema.columns')
                .select('column_name')
                .eq('table_schema', 'public')
                .eq('table_name', tableName)
                .eq('column_name', 'updated_at')
                .single();

            const needsCreatedAt = !createdAtExists || createdAtError;
            const needsUpdatedAt = !updatedAtExists || updatedAtError;

            // Add columns if needed
            if (needsCreatedAt || needsUpdatedAt) {
                let alterTableSQL = `ALTER TABLE "${tableName}"`;

                if (needsCreatedAt) {
                    alterTableSQL += ` ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`;
                    message += `Added created_at to ${tableName}. `;
                }

                if (needsUpdatedAt) {
                    if (needsCreatedAt) alterTableSQL += ',';
                    alterTableSQL += ` ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`;
                    message += `Added updated_at to ${tableName}. `;
                }

                alterTableSQL += ';';

                try {
                    const { error: alterError } = await supabase.rpc('runtime_query', { query_text: alterTableSQL });

                    if (alterError) {
                        message = `Error updating ${tableName}: ${alterError.message}`;
                        console.error(`❌ ${message}`);
                    } else {
                        updated = true;
                        tablesUpdated++;
                        console.log(`✅ ${message}`);
                    }
                } catch (error) {
                    message = `Error updating ${tableName}: ${error.message}`;
                    console.error(`❌ ${message}`);
                }
            } else {
                message = `Table ${tableName} already has both timestamp columns`;
                console.log(`ℹ️ ${message}`);
            }

            tableResults.push({
                table: tableName,
                updated,
                message
            });
        }

        // Add triggers to update updated_at automatically
        console.log('\n🔄 Adding triggers to update the updated_at column automatically...');

        try {
            const triggerSQL = `
            DO $$ 
            BEGIN
                -- Create function to update updated_at timestamp
                CREATE OR REPLACE FUNCTION update_timestamp()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = NOW();
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;

                -- Apply trigger to all tables with updated_at column
                FOR table_name IN 
                    SELECT tables.table_name 
                    FROM information_schema.tables 
                    JOIN information_schema.columns ON tables.table_name = columns.table_name 
                    WHERE columns.column_name = 'updated_at'
                    AND tables.table_schema = 'public'
                LOOP
                    -- Check if trigger already exists for this table
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_trigger 
                        WHERE tgname = 'set_timestamp_' || table_name
                    ) THEN
                        EXECUTE format('
                            CREATE TRIGGER set_timestamp_%I
                            BEFORE UPDATE ON %I
                            FOR EACH ROW
                            EXECUTE FUNCTION update_timestamp();
                        ', table_name, table_name);
                    END IF;
                END LOOP;
            END $$;
            `;

            const { error: triggerError } = await supabase.rpc('runtime_query', { query_text: triggerSQL });

            if (triggerError) {
                console.error(`❌ Error setting up triggers: ${triggerError.message}`);
            } else {
                console.log(`✅ Successfully set up automatic timestamp triggers`);
            }
        } catch (error) {
            console.error(`❌ Error setting up triggers: ${error.message}`);
        }

        // Summary
        console.log('\n📋 SUMMARY:');
        console.log(`Total tables: ${tables.length}`);
        console.log(`Tables updated: ${tablesUpdated}`);
        console.log(`Tables already complete: ${tables.length - tablesUpdated}`);

        if (tablesUpdated > 0) {
            console.log('\n✅ Timestamp columns added successfully. This will improve the polling fallback mechanism.');
        } else {
            console.log('\n✅ All tables already have timestamp columns! No changes needed.');
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

main().catch(console.error); 