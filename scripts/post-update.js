#!/usr/bin/env node

/**
 * GearFlow Post-Update Script
 * 
 * This script runs automatically after updates to ensure
 * the system is properly configured.
 * 
 * Current checks:
 * - Supabase Realtime functionality
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ASCII art banner for visual appeal
const banner = `
╔════════════════════════════════════════════════════════╗
║                                                        ║
║         GEARFLOW SYSTEM UPDATE VERIFICATION            ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
`;

console.log(banner);
console.log('Checking system configuration after update...\n');

// Function to check if a file exists
function fileExists(filePath) {
    try {
        return fs.existsSync(filePath);
    } catch (err) {
        return false;
    }
}

// Check if realtime checker exists
const realtimeCheckerPath = path.join(__dirname, '../src/utils/supabase-realtime-checker.ts');
const realtimeSetupPath = path.join(__dirname, './enable-realtime.js');

console.log('📡 Checking Supabase Realtime configuration...');

if (fileExists(realtimeCheckerPath) && fileExists(realtimeSetupPath)) {
    console.log(' Realtime utilities detected.');

    try {
        console.log('\n  Running Realtime status check...');
        console.log('-----------------------------------');

        // Run the realtime checker and capture its output
        const realtimeStatus = execSync('npm run realtime:check').toString();

        // If we have tables with Realtime disabled, suggest setup
        if (realtimeStatus.includes('Tables with Realtime DISABLED')) {
            console.log('\n  Some tables don\'t have Realtime enabled!');
            console.log('This will cause live updates to fall back to polling (slower updates).');
            console.log('\n To enable Realtime for all tables, run:');
            console.log('npm run realtime:setup');
        } else {
            console.log('\n Realtime configuration looks good!');
        }
    } catch (error) {
        console.log('\n  Could not check Realtime status automatically.');
        console.log('You can check manually by running:');
        console.log('npm run realtime:check');
    }
} else {
    console.log('  Realtime utilities not found. This might be expected if you\'re on an older version.');
}

console.log('\n✨ Post-update check complete!');
console.log('If you encounter any issues, please check the troubleshooting guide in README.md.');
console.log('Or run "npm run realtime:setup" to configure Realtime functionality.\n');

// Exit successfully
process.exit(0); 