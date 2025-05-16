#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Path to the old hooks directory
const hookFilePath = path.join(__dirname, '..', 'src', 'hooks', 'useSupabaseSubscription.ts');

// Remove the old hook file
console.log(`Removing unused hook file: ${hookFilePath}`);
if (fs.existsSync(hookFilePath)) {
    fs.unlinkSync(hookFilePath);
    console.log('✅ Hook file removed successfully');
} else {
    console.log('⚠️ Hook file not found, skipping deletion');
}

console.log('🎉 Cleanup completed successfully!'); 