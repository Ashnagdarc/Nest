/**
 * This script helps identify console.log statements in the codebase
 * that should be reviewed before deploying to production.
 * 
 * Run with: node scripts/prepare-for-production.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get list of files with console.log statements
const getFilesWithConsoleLogs = () => {
    try {
        // On macOS, the grep command might behave differently, so we'll use a different approach
        // First find TypeScript and JavaScript files
        const findCommand = `find src -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | grep -v "node_modules" | grep -v ".next"`;
        const files = execSync(findCommand, { encoding: 'utf8' }).split('\n').filter(Boolean);

        const results = {};

        // Now check each file for console.log statements
        files.forEach(file => {
            try {
                const content = fs.readFileSync(file, 'utf8');
                const lines = content.split('\n');

                const consoleLogLines = [];
                lines.forEach((line, index) => {
                    if (line.includes('console.log')) {
                        consoleLogLines.push({
                            line: index + 1,
                            content: line.trim()
                        });
                    }
                });

                if (consoleLogLines.length > 0) {
                    results[file] = consoleLogLines;
                }
            } catch (readError) {
                console.error(`Error reading file ${file}:`, readError.message);
            }
        });

        return results;
    } catch (error) {
        console.error('Error finding files:', error.message);
        return {};
    }
};

// Main function
const main = () => {
    console.log('Preparing codebase for production...\n');

    // Check for console.log statements
    console.log('Checking for console.log statements:');
    const consoleLogFiles = getFilesWithConsoleLogs();

    if (Object.keys(consoleLogFiles).length === 0) {
        console.log('✅ No console.log statements found!');
    } else {
        console.log(`⚠️ Found console.log statements in ${Object.keys(consoleLogFiles).length} files:\n`);

        for (const filePath in consoleLogFiles) {
            console.log(`📄 ${filePath} (${consoleLogFiles[filePath].length} instances)`);
            consoleLogFiles[filePath].forEach(instance => {
                console.log(`   Line ${instance.line}: ${instance.content}`);
            });
            console.log('');
        }

        console.log('\nConsider removing or replacing console.log statements with proper logging before deploying to production.');
        console.log('You can use src/lib/logger.ts for production-appropriate logging.');
    }

    // Also check for TODO and FIXME comments
    console.log('\nChecking for TODO and FIXME comments:');
    try {
        const todoCommand = `grep -r "TODO\\|FIXME" --include="*.{ts,tsx,js,jsx}" src/ || true`;
        const todoOutput = execSync(todoCommand, { encoding: 'utf8' });

        if (!todoOutput.trim()) {
            console.log('✅ No TODO or FIXME comments found!');
        } else {
            const todoLines = todoOutput.split('\n').filter(Boolean);
            console.log(`⚠️ Found ${todoLines.length} TODO or FIXME comments:`);
            todoLines.forEach(line => {
                console.log(`   ${line}`);
            });
            console.log('\nConsider addressing these TODOs or FIXMEs before deploying to production.');
        }
    } catch (error) {
        console.error('Error checking for TODOs:', error.message);
    }

    console.log('\nProduction preparation check complete!');
};

main(); 