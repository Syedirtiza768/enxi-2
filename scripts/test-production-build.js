#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== Testing Production Build ===\n');

const projectRoot = process.cwd();
console.log('Project root:', projectRoot);

// Check if .next directory exists
const nextDir = path.join(projectRoot, '.next');
if (fs.existsSync(nextDir)) {
    console.log('✓ .next directory exists');
    
    // Check for prerender-manifest.json
    const prerenderManifest = path.join(nextDir, 'prerender-manifest.json');
    if (fs.existsSync(prerenderManifest)) {
        console.log('✓ prerender-manifest.json exists');
        const content = fs.readFileSync(prerenderManifest, 'utf8');
        console.log('Content:', content.substring(0, 100) + '...');
    } else {
        console.log('✗ prerender-manifest.json NOT FOUND');
        
        // List contents of .next directory
        console.log('\nContents of .next directory:');
        const files = fs.readdirSync(nextDir);
        files.forEach(file => console.log('  -', file));
    }
    
    // Check other important files
    const serverDir = path.join(nextDir, 'server');
    console.log('\nServer directory exists:', fs.existsSync(serverDir));
    
    const staticDir = path.join(nextDir, 'static');
    console.log('Static directory exists:', fs.existsSync(staticDir));
    
} else {
    console.log('✗ .next directory NOT FOUND');
    console.log('\nYou need to run: npm run build');
}

// Check package.json
const packageJson = path.join(projectRoot, 'package.json');
if (fs.existsSync(packageJson)) {
    const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
    console.log('\nBuild script:', pkg.scripts.build);
    console.log('Start script:', pkg.scripts.start);
} else {
    console.log('\n✗ package.json NOT FOUND');
}

console.log('\n=== Test Complete ===');