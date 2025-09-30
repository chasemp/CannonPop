#!/usr/bin/env node

/**
 * Version management script for cache-busting
 * Based on MealPlanner PWA lessons learned
 */

const fs = require('fs');
const path = require('path');

// Generate timestamp-based version (YYYY.MM.DD.HHMM format)
// Avoid ESBuild loader conflicts by ensuring version doesn't end in 0000
function generateVersion() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    
    const baseVersion = `${year}${month}${day}${hour}${minute}`;
    
    // Add a suffix to avoid ESBuild conflicts with loader values like "0000"
    return `v${baseVersion}`;
}

// Update version in HTML files
function updateVersionInFile(filePath, newVersion) {
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        return false;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    // Update CSS version parameters (supports both old and new formats)
    content = content.replace(
        /\.css\?v=[v\d.]+/g,
        (match) => {
            updated = true;
            return `.css?v=${newVersion}`;
        }
    );
    
    // Update JS version parameters (supports both old and new formats)
    content = content.replace(
        /\.js\?v=[v\d.]+/g,
        (match) => {
            updated = true;
            return `.js?v=${newVersion}`;
        }
    );
    
    // Update TS version parameters for Vite dev server
    content = content.replace(
        /\.ts\?v=[v\d.]+/g,
        (match) => {
            updated = true;
            return `.ts?v=${newVersion}`;
        }
    );
    
    // Add version parameters if they don't exist
    if (!updated) {
        content = content.replace(
            /(href="[^"]+\.css")/g,
            `$1?v=${newVersion}`
        );
        content = content.replace(
            /(src="[^"]+\.js")/g,
            `$1?v=${newVersion}`
        );
        updated = true;
    }
    
    if (updated) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Updated versions in ${filePath} to ${newVersion}`);
    }
    
    return updated;
}

// Main execution
function main() {
    const newVersion = generateVersion();
    console.log(`🔄 Updating cache-busting version to: ${newVersion}`);
    
    const filesToUpdate = [
        'index.html',
        'game.html'
    ];
    
    let totalUpdated = 0;
    
    filesToUpdate.forEach(file => {
        if (updateVersionInFile(file, newVersion)) {
            totalUpdated++;
        }
    });
    
    console.log(`\n🎯 Cache-busting complete!`);
    console.log(`   Version: ${newVersion}`);
    console.log(`   Files updated: ${totalUpdated}/${filesToUpdate.length}`);
    console.log(`   Next: git add -A && git commit -m "Cache bust: ${newVersion}" && git push`);
}

if (require.main === module) {
    main();
}

module.exports = { generateVersion, updateVersionInFile };
