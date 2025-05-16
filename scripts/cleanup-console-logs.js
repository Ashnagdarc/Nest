/**
 * This script automatically replaces console.log statements with appropriate logger calls.
 * It will create a backup of each modified file before making changes.
 * 
 * Run with: node scripts/cleanup-console-logs.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get list of files with console.log statements
const getFilesWithConsoleLogs = () => {
    try {
        // Find TypeScript and JavaScript files
        const findCommand = `find src -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | grep -v "node_modules" | grep -v ".next"`;
        const files = execSync(findCommand, { encoding: 'utf8' }).split('\n').filter(Boolean);

        const results = {};

        // Check each file for console.log statements
        files.forEach(file => {
            try {
                const content = fs.readFileSync(file, 'utf8');
                const lines = content.split('\n');

                const consoleLogLines = [];
                lines.forEach((line, index) => {
                    if (line.includes('console.log')) {
                        consoleLogLines.push({
                            line: index + 1,
                            content: line.trim(),
                            originalLine: line
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

// Replace console.log with logger calls
const replaceConsoleLogs = (filePath, consoleLogLines) => {
    try {
        // Create backup of the file
        const backupPath = `${filePath}.backup`;
        fs.copyFileSync(filePath, backupPath);

        // Read the file content
        const content = fs.readFileSync(filePath, 'utf8');
        let lines = content.split('\n');

        // Check if the file already imports logger
        const hasLoggerImport = lines.some(line =>
            line.includes('import { logger }') ||
            line.includes("import logger") ||
            line.includes("from '@/lib/logger'") ||
            line.includes("from '@/utils/logger'")
        );

        // Add logger import if needed (after other imports)
        if (!hasLoggerImport) {
            const lastImportIndex = lines.reduce((lastIndex, line, index) => {
                if (line.trim().startsWith('import ')) {
                    return index;
                }
                return lastIndex;
            }, -1);

            if (lastImportIndex >= 0) {
                lines.splice(lastImportIndex + 1, 0, "import { logger } from '@/lib/logger';");
            }
        }

        // Replace console.log with logger.info or logger.debug
        // Process in reverse order to avoid affecting line numbers
        [...consoleLogLines].reverse().forEach(({ line, originalLine }) => {
            const lineIndex = line - 1;
            const indentation = originalLine.match(/^(\s*)/)[1] || '';

            // Extract the message and parameters from console.log
            const match = originalLine.match(/console\.log\((.*)\)/);
            if (match && match[1]) {
                const params = match[1].trim();

                // Determine if this is a debug or info log
                const logFunction = originalLine.toLowerCase().includes('error') ? 'error' : 'info';

                // Create new line with logger
                const newLine = `${indentation}logger.${logFunction}(${params});`;

                // Replace the line
                lines[lineIndex] = newLine;
            }
        });

        // Write the modified content back to the file
        fs.writeFileSync(filePath, lines.join('\n'));

        return true;
    } catch (error) {
        console.error(`Error replacing console.logs in ${filePath}:`, error.message);
        return false;
    }
};

// Main function
const main = () => {
    console.log('Starting console.log cleanup...\n');

    // Get files with console.log statements
    const consoleLogFiles = getFilesWithConsoleLogs();
    const fileCount = Object.keys(consoleLogFiles).length;

    if (fileCount === 0) {
        console.log('✅ No console.log statements found. Nothing to do!');
        return;
    }

    console.log(`Found console.log statements in ${fileCount} files.\n`);

    // Replace console.log statements in each file
    let successCount = 0;
    let failureCount = 0;

    for (const filePath in consoleLogFiles) {
        const instanceCount = consoleLogFiles[filePath].length;
        process.stdout.write(`Processing ${filePath} (${instanceCount} instances)... `);

        const success = replaceConsoleLogs(filePath, consoleLogFiles[filePath]);

        if (success) {
            console.log('✅ Done!');
            successCount++;
        } else {
            console.log('❌ Failed!');
            failureCount++;
        }
    }

    console.log('\nSummary:');
    console.log(`- Processed ${fileCount} files`);
    console.log(`- Successfully updated ${successCount} files`);
    console.log(`- Failed to update ${failureCount} files`);

    if (failureCount > 0) {
        console.log('\n⚠️ Some files could not be updated. Check the error messages above.');
    } else {
        console.log('\n✅ All files successfully updated!');
    }

    console.log('\nA backup of each modified file has been created with a .backup extension.');
    console.log('You can use these backups to revert changes if necessary.');
};

main(); 