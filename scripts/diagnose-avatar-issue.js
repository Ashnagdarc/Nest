#!/usr/bin/env node
/**
 * Avatar Upload Diagnostic Script
 * 
 * This script diagnoses avatar upload issues by checking:
 * 1. Database connection and table existence
 * 2. Storage bucket configuration
 * 3. RLS policies
 * 4. Sample data verification
 * 
 * Usage: node scripts/diagnose-avatar-issue.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    console.log('Required variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 AVATAR UPLOAD DIAGNOSTIC SCAN');
console.log('================================\n');

async function checkDatabaseConnection() {
    console.log('1️⃣ Testing Database Connection...');
    try {
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        if (error) {
            console.log(`   ❌ Connection Error: ${error.message}`);
            return false;
        }
        console.log('   ✅ Database connection successful');
        return true;
    } catch (err) {
        console.log(`   ❌ Unexpected error: ${err.message}`);
        return false;
    }
}

async function checkTablesExist() {
    console.log('\n2️⃣ Checking Table Existence...');

    const tables = ['profiles', 'gears', 'gear_requests', 'notifications'];
    const results = {};

    for (const table of tables) {
        try {
            const { data, error } = await supabase.from(table).select('count', { count: 'exact', head: true });
            if (error) {
                console.log(`   ❌ Table '${table}': ${error.message}`);
                results[table] = false;
            } else {
                console.log(`   ✅ Table '${table}': EXISTS (${data?.[0]?.count || 0} rows)`);
                results[table] = true;
            }
        } catch (err) {
            console.log(`   ❌ Table '${table}': ${err.message}`);
            results[table] = false;
        }
    }

    return results;
}

async function checkProfilesStructure() {
    console.log('\n3️⃣ Checking Profiles Table Structure...');

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, email, role, avatar_url')
            .limit(1);

        if (error) {
            console.log(`   ❌ Cannot query profiles: ${error.message}`);
            return false;
        }

        console.log('   ✅ Profiles table has required columns:');
        console.log('      - id ✅');
        console.log('      - full_name ✅');
        console.log('      - email ✅');
        console.log('      - role ✅');
        console.log('      - avatar_url ✅');

        return true;
    } catch (err) {
        console.log(`   ❌ Structure check failed: ${err.message}`);
        return false;
    }
}

async function checkStorageBuckets() {
    console.log('\n4️⃣ Checking Storage Buckets...');

    try {
        const { data: buckets, error } = await supabase.storage.listBuckets();

        if (error) {
            console.log(`   ❌ Cannot list buckets: ${error.message}`);
            return false;
        }

        const avatarBucket = buckets.find(b => b.id === 'avatars');
        if (avatarBucket) {
            console.log('   ✅ Avatars bucket exists');
            console.log(`      - Public: ${avatarBucket.public ? 'Yes' : 'No'}`);
            console.log(`      - Created: ${avatarBucket.created_at}`);
            return true;
        } else {
            console.log('   ❌ Avatars bucket missing');
            console.log('   Available buckets:', buckets.map(b => b.id).join(', '));
            return false;
        }
    } catch (err) {
        console.log(`   ❌ Storage check failed: ${err.message}`);
        return false;
    }
}

async function testAvatarUpload() {
    console.log('\n5️⃣ Testing Avatar Upload...');

    try {
        // Create a small test file
        const testContent = 'test-avatar-content';
        const testBlob = new Blob([testContent], { type: 'text/plain' });
        const testFile = new File([testBlob], 'test-avatar.txt', { type: 'text/plain' });

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload('test-uploads/diagnostic-test.txt', testFile, { upsert: true });

        if (uploadError) {
            console.log(`   ❌ Upload failed: ${uploadError.message}`);
            return false;
        }

        console.log('   ✅ Upload successful');

        // Test public URL generation
        const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(uploadData.path);

        console.log(`   ✅ Public URL generated: ${urlData.publicUrl}`);

        // Clean up test file
        await supabase.storage
            .from('avatars')
            .remove(['test-uploads/diagnostic-test.txt']);

        console.log('   ✅ Test cleanup completed');
        return true;
    } catch (err) {
        console.log(`   ❌ Upload test failed: ${err.message}`);
        return false;
    }
}

async function checkCurrentUser() {
    console.log('\n6️⃣ Checking Current User Authentication...');

    try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
            console.log(`   ❌ Auth error: ${error.message}`);
            return false;
        }

        if (user) {
            console.log(`   ✅ User authenticated: ${user.email}`);
            console.log(`   📅 Last sign in: ${user.last_sign_in_at}`);

            // Check if user has a profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError) {
                console.log(`   ❌ Profile not found: ${profileError.message}`);
                return false;
            }

            console.log(`   ✅ Profile exists: ${profile.full_name || profile.email}`);
            console.log(`   👤 Role: ${profile.role}`);
            console.log(`   🖼️  Avatar: ${profile.avatar_url ? 'Set' : 'Not set'}`);

            return true;
        } else {
            console.log('   ❌ No authenticated user');
            return false;
        }
    } catch (err) {
        console.log(`   ❌ User check failed: ${err.message}`);
        return false;
    }
}

async function generateDiagnosticReport() {
    console.log('\n📊 DIAGNOSTIC SUMMARY');
    console.log('=====================');

    const results = {
        connection: await checkDatabaseConnection(),
        tables: await checkTablesExist(),
        structure: await checkProfilesStructure(),
        storage: await checkStorageBuckets(),
        upload: await testAvatarUpload(),
        auth: await checkCurrentUser()
    };

    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('===================');

    if (!results.connection) {
        console.log('❌ Fix database connection issues first');
    }

    if (!results.tables.profiles) {
        console.log('❌ Run profiles table migration: supabase/migrations/20240607_sync_profiles_table.sql');
    }

    if (!results.storage) {
        console.log('❌ Run storage setup: sql/storage/setup_avatar_storage.sql');
    }

    if (!results.upload) {
        console.log('❌ Check storage policies and bucket permissions');
    }

    if (!results.auth) {
        console.log('❌ Verify user authentication and profile creation trigger');
    }

    const allGood = Object.values(results).every(r =>
        typeof r === 'boolean' ? r : Object.values(r).every(v => v)
    );

    if (allGood) {
        console.log('✅ All checks passed! Avatar upload should work correctly.');
    } else {
        console.log('❌ Issues found. Follow the recommendations above.');
    }

    return results;
}

// Run the diagnostic
generateDiagnosticReport()
    .then(() => {
        console.log('\n🏁 Diagnostic completed.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n💥 Diagnostic failed:', err.message);
        process.exit(1);
    }); 