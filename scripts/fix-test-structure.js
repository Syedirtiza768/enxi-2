#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Fixing test structure in component tests...\n');

const testFiles = glob.sync('**/tests/**/*.test.tsx');

let filesFixed = 0;
let errors = [];

testFiles.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    let modified = false;

    // Fix specific patterns where closing braces are missing
    // Pattern 1: Fix waitFor blocks that are missing closing braces
    const waitForPattern = /await waitFor\(\(\) => \{[^}]+\}\)/g;
    let matches = content.match(waitForPattern) || [];
    
    matches.forEach(match => {
      // Check if this waitFor is at the end of an it block and missing closing
      const index = content.indexOf(match);
      const afterMatch = content.substring(index + match.length, index + match.length + 10);
      
      if (afterMatch.trim().startsWith('})') && !afterMatch.includes('})')) {
        // This waitFor needs a closing })
        content = content.substring(0, index + match.length) + '\n    })' + content.substring(index + match.length);
        modified = true;
      }
    });

    // Fix specific pattern where there's a }) on its own line followed by another })
    const lines = content.split('\n');
    let fixedLines = [];
    let inItBlock = false;
    let itBlockDepth = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Track if we're in an it() block
      if (trimmedLine.match(/^\s*it\s*\(/)) {
        inItBlock = true;
        itBlockDepth = 0;
      }
      
      // Count braces
      if (inItBlock) {
        itBlockDepth += (line.match(/\{/g) || []).length;
        itBlockDepth -= (line.match(/\}/g) || []).length;
        
        // If we've closed all braces, we're done with this it block
        if (itBlockDepth <= 0) {
          inItBlock = false;
        }
      }
      
      // Fix the pattern where }) appears alone but there's a missing })
      if (trimmedLine === '})' && i + 1 < lines.length && lines[i + 1].trim() === '})') {
        // Check if this is at the end of an it block that needs another closing
        const nextNonEmpty = lines.slice(i + 2).find(l => l.trim() !== '');
        if (nextNonEmpty && nextNonEmpty.trim().match(/^\s*(it|test|describe)\s*\(/)) {
          // This looks like the end of a test, add the missing brace
          fixedLines.push(line);
          fixedLines.push('  })');
          i++; // Skip the next })
          modified = true;
          continue;
        }
      }
      
      fixedLines.push(line);
    }
    
    if (modified) {
      content = fixedLines.join('\n');
    }

    // Fix missing closing for describe blocks
    const describeCount = (content.match(/\bdescribe\s*\(/g) || []).length;
    const topLevelClosing = content.match(/^\}\)\s*$/gm) || [];
    
    if (describeCount > topLevelClosing.length) {
      // Add missing closing
      if (!content.endsWith('\n')) {
        content += '\n';
      }
      content += '})\n';
      modified = true;
    }

    if (content !== originalContent) {
      fs.writeFileSync(file, content);
      filesFixed++;
      console.log(`✅ Fixed: ${file}`);
    }

  } catch (error) {
    errors.push({ file, error: error.message });
  }
});

console.log(`\n✨ Fixed ${filesFixed} test files`);

if (errors.length > 0) {
  console.error('\n❌ Errors encountered:');
  errors.forEach(({ file, error }) => {
    console.error(`   ${file}: ${error}`);
  });
}