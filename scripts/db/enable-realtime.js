#!/usr/bin/env node

/**
 * Supabase Realtime Setup Script
 * 
 * This script provides guidance on how to enable Realtime for all
 * necessary tables in your Supabase project.
 * 
 * Usage:
 * 1. Run this script: node scripts/enable-realtime.js
 * 2. Follow the instructions provided
 */

console.log(`
========================================================
🔄 SUPABASE REALTIME SETUP FOR GEARFLOW
========================================================

This script will guide you through the process of enabling
Realtime for all necessary tables in your Supabase project.

IMPORTANT TABLES THAT NEED REALTIME:
- gears
- gear_requests
- gear_maintenance
- gear_activity_log
- notifications
- profiles

Follow these steps:

1️⃣  Log in to your Supabase dashboard:
   https://app.supabase.com

2️⃣  Select your project

3️⃣  Navigate to:
   Database → Realtime

4️⃣  If you don't see a publication yet:
   - Click "Create a new publication"
   - Name it "gearflow_realtime"
   - Select all the tables listed above

5️⃣  If you already have a publication:
   - Click "Edit publication"
   - Make sure all the tables listed above are included

6️⃣  VERIFY SETUP:
   After enabling Realtime, you can run:
   npx tsx src/utils/supabase-realtime-checker.ts
   
   This will check if all necessary tables have Realtime enabled.

========================================================
✨ That's it! Your Supabase Realtime should now be working.
========================================================
`);

// Check if we can run the verification script directly
try {
    const { spawn } = require('child_process');

    console.log('\n🔍 Would you like to verify your Realtime setup? (y/n)');
    process.stdin.once('data', (data) => {
        const input = data.toString().trim().toLowerCase();

        if (input === 'y' || input === 'yes') {
            console.log('\n⏳ Running verification script...\n');

            const checker = spawn('npx', ['tsx', 'src/utils/supabase-realtime-checker.ts'], {
                stdio: 'inherit'
            });

            checker.on('close', (code) => {
                if (code !== 0) {
                    console.log('\n❌ Verification script failed. Please check your environment setup.');
                }
                process.exit(0);
            });
        } else {
            console.log('\n👋 You can run the verification script later with:');
            console.log('npx tsx src/utils/supabase-realtime-checker.ts');
            process.exit(0);
        }
    });

} catch (error) {
    console.log('\n⚠️ Could not run verification script automatically.');
    console.log('You can run it manually with:');
    console.log('npx tsx src/utils/supabase-realtime-checker.ts');
    process.exit(0);
} 