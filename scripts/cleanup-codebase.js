#!/usr/bin/env node

/**
 * Cleanup Codebase
 * 
 * This script identifies and cleans up unnecessary files created during
 * the realtime troubleshooting process, ensuring a clean codebase for
 * production deployment.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 Cleaning up codebase...');

// Files that are no longer needed after fixes have been implemented
const temporaryFiles = [
    // Temporary troubleshooting scripts
    'scripts/fix-refresh-issue.js',
    'scripts/fix-realtime-permanent.js',
    'scripts/troubleshooting/check-realtime-tables.js',
    'scripts/troubleshooting/fix-gear-request-gears.js',

    // Empty or duplicate scripts
    'scripts/check-tables.ts',
    'scripts/list-tables.ts',
];

// Files that should be kept but organized into a better location
const filesToOrganize = [
    // Useful utility scripts to keep but move
    { source: 'scripts/add-timestamp-columns.js', destination: 'scripts/db/add-timestamp-columns.js' },
    { source: 'scripts/enable-realtime.js', destination: 'scripts/db/enable-realtime.js' }
];

// Documentation files to update for cleaner paths
const docsToUpdate = [
    'package.json',
    'REALTIME-TROUBLESHOOTING.md'
];

// Create directories if they don't exist
function ensureDirectoryExists(directoryPath) {
    const parts = directoryPath.split(path.sep);
    let currentPath = '';

    for (const part of parts) {
        currentPath = path.join(currentPath, part);
        if (!fs.existsSync(currentPath)) {
            fs.mkdirSync(currentPath);
            console.log(`📁 Created directory: ${currentPath}`);
        }
    }
}

// Delete files that are no longer needed
function removeTemporaryFiles() {
    console.log('\n🗑️ Removing temporary files:');

    for (const file of temporaryFiles) {
        const filePath = path.join(process.cwd(), file);

        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
                console.log(`✅ Deleted: ${file}`);
            } catch (error) {
                console.error(`❌ Error deleting ${file}: ${error.message}`);
            }
        } else {
            console.log(`ℹ️ Not found: ${file} (already deleted)`);
        }
    }
}

// Organize files into better locations
function organizeFiles() {
    console.log('\n📂 Organizing files:');

    for (const { source, destination } of filesToOrganize) {
        const sourcePath = path.join(process.cwd(), source);
        const destPath = path.join(process.cwd(), destination);
        const destDir = path.dirname(destPath);

        if (fs.existsSync(sourcePath)) {
            try {
                // Create destination directory if it doesn't exist
                ensureDirectoryExists(destDir);

                // Copy file to new location
                fs.copyFileSync(sourcePath, destPath);
                console.log(`✅ Copied: ${source} → ${destination}`);

                // Delete original file
                fs.unlinkSync(sourcePath);
                console.log(`✅ Deleted original: ${source}`);
            } catch (error) {
                console.error(`❌ Error organizing ${source}: ${error.message}`);
            }
        } else {
            console.log(`ℹ️ Not found: ${source}`);
        }
    }
}

// Update documentation to reflect new file locations
function updateDocs() {
    console.log('\n📝 Updating documentation:');

    // Update package.json scripts
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

            // Update script paths
            if (packageJson.scripts) {
                // Update scripts to point to new locations
                if (packageJson.scripts['realtime:setup']) {
                    packageJson.scripts['realtime:setup'] = 'node scripts/db/enable-realtime.js';
                }
                if (packageJson.scripts['add-timestamps']) {
                    packageJson.scripts['add-timestamps'] = 'node scripts/db/add-timestamp-columns.js';
                }

                // Remove cleanup scripts that are no longer needed
                delete packageJson.scripts['fix-refresh'];
                delete packageJson.scripts['troubleshoot:gear-request-gears'];

                // Add new cleanup script
                packageJson.scripts['cleanup'] = 'node scripts/cleanup-codebase.js';

                fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
                console.log('✅ Updated: package.json');
            }
        } catch (error) {
            console.error(`❌ Error updating package.json: ${error.message}`);
        }
    }

    // Update REALTIME-TROUBLESHOOTING.md
    const troubleshootingPath = path.join(process.cwd(), 'REALTIME-TROUBLESHOOTING.md');
    if (fs.existsSync(troubleshootingPath)) {
        try {
            let content = fs.readFileSync(troubleshootingPath, 'utf8');

            // Update script paths
            content = content.replace(/npm run realtime:setup/g, 'npm run realtime:setup');
            content = content.replace(/npm run add-timestamps/g, 'npm run add-timestamps');
            content = content.replace(/npm run troubleshoot:gear-request-gears/g, 'npm run realtime:check');

            // Additional notice that some scripts have been removed
            content += `\n\n## Updates After Fixes\n\nSome troubleshooting scripts mentioned in this document have been removed or reorganized after successfully implementing the fixes. Use \`npm run realtime:check\` for any further diagnostics.\n`;

            fs.writeFileSync(troubleshootingPath, content);
            console.log('✅ Updated: REALTIME-TROUBLESHOOTING.md');
        } catch (error) {
            console.error(`❌ Error updating REALTIME-TROUBLESHOOTING.md: ${error.message}`);
        }
    }
}

// Create a README for the scripts/db directory
function createScriptsReadme() {
    console.log('\n📄 Creating documentation for scripts:');

    const readmePath = path.join(process.cwd(), 'scripts/db/README.md');
    const readmeContent = `# Database Utilities

This directory contains scripts for managing and maintaining the Supabase database.

## Available Scripts

- **add-timestamp-columns.js** - Adds created_at and updated_at columns to all tables that don't have them
- **enable-realtime.js** - Assists with enabling Realtime for tables in Supabase

## Usage

Run these scripts using npm:

\`\`\`bash
npm run add-timestamps
npm run realtime:setup
\`\`\`

## Notes

These scripts are part of the realtime handling infrastructure that ensures the application can fall back to polling when Realtime is unavailable.
`;

    try {
        // Create directory if it doesn't exist
        ensureDirectoryExists(path.dirname(readmePath));

        // Create README
        fs.writeFileSync(readmePath, readmeContent);
        console.log('✅ Created: scripts/db/README.md');
    } catch (error) {
        console.error(`❌ Error creating scripts README: ${error.message}`);
    }
}

// Main execution
try {
    removeTemporaryFiles();
    organizeFiles();
    updateDocs();
    createScriptsReadme();

    console.log('\n✅ Codebase cleanup completed!');
    console.log('\nNext steps:');
    console.log('1. Commit these changes to your repository');
    console.log('2. Consider running tests to ensure everything works correctly');
    console.log('3. Review the updated documentation');
} catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
} 