#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

console.log('🧹 Final syntax cleanup for test files...\n');

// Find all test files
const testFiles = glob.sync('tests/**/*.{test,spec}.{ts,tsx,js,jsx}', {
  ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
});

console.log(`Found ${testFiles.length} test files to process\n`);

let totalFixed = 0;
let processedFiles = 0;

function fixSyntaxErrors(content) {
  let fixed = content;
  let hasChanges = false;

  // 1. Fix missing closing braces in constructor calls
  const constructorPattern = /constructor\(...args: any\[\]\) \{\s*if \(args\.length === 0\) \{\s*super\(dateString\)\s*\} else \{\s*super\(...args\)\s*$/gm;
  if (constructorPattern.test(fixed)) {
    fixed = fixed.replace(constructorPattern, (match) => {
      return match + '\n      }\n    }';
    });
    hasChanges = true;
  }

  // 2. Fix missing closing braces and parentheses in expect statements  
  fixed = fixed.replace(/expect\(result\)\.toEqual\(\{\s*NEW: 5,\s*CONTACTED: 3,\s*QUALIFIED: 2,\s*PROPOSAL_SENT: 0,\s*NEGOTIATING: 0,\s*CONVERTED: 0,\s*LOST: 0,\s*DISQUALIFIED: 0,\)\s*\}\)$/gm, 
    'expect(result).toEqual({\n        NEW: 5,\n        CONTACTED: 3,\n        QUALIFIED: 2,\n        PROPOSAL_SENT: 0,\n        NEGOTIATING: 0,\n        CONVERTED: 0,\n        LOST: 0,\n        DISQUALIFIED: 0,\n      })');

  // 3. Fix incomplete object destructuring in expect calls
  fixed = fixed.replace(/role: mockUser\.role,\)\s*\}\)/gm, 'role: mockUser.role,\n        })');

  // 4. Fix incomplete where clauses
  fixed = fixed.replace(/where: \{ id: '1' \},\)\s*\}\)$/gm, 'where: { id: \'1\' },\n      })');

  // 5. Fix missing closing parentheses in .toHaveBeenCalledWith calls
  fixed = fixed.replace(/\.toHaveBeenCalledWith\(\{\s*where: \{ username: 'admin' \},\)\s*\}\)$/gm, 
    '.toHaveBeenCalledWith({\n        where: { username: \'admin\' },\n      })');

  // 6. Fix incomplete mock object patterns
  fixed = fixed.replace(/data: \{\s*\.\.\.userData,\s*password: hashedPassword,\s*\},\)\s*\}\)$/gm,
    'data: {\n          ...userData,\n          password: hashedPassword,\n        },\n      })');

  // 7. Fix missing closing braces in object literals
  fixed = fixed.replace(/id: mockUser\.id,\s*username: mockUser\.username,\s*email: mockUser\.email,\s*role: mockUser\.role,\)\s*\}\)$/gm,
    'id: mockUser.id,\n        username: mockUser.username,\n        email: mockUser.email,\n        role: mockUser.role,\n      })');

  // 8. Fix incomplete .toHaveBeenCalledWith patterns
  fixed = fixed.replace(/\.toHaveBeenCalledWith\(\s*user,\s*process\.env\.JWT_SECRET \|\| 'default-secret',\s*\{ expiresIn: '7d' \}\)\s*\)$/gm,
    '.toHaveBeenCalledWith(\n        user,\n        process.env.JWT_SECRET || \'default-secret\',\n        { expiresIn: \'7d\' }\n      )');

  // 9. Fix standalone objects after expect calls
  fixed = fixed.replace(/expect\(jwt\.sign\)\.toHaveBeenCalledWith\(\{ userId: mockUser\.id,\s*username: mockUser\.username,\s*email: mockUser\.email,\s*role: mockUser\.role,\)\s*\}\)\s*\{\s*userId: mockUser\.id,\s*username: mockUser\.username,\s*email: mockUser\.email,\s*role: mockUser\.role,\s*\},\s*expect\.any\(String\),\s*\{ expiresIn: '7d'\s*\}\)/gm,
    'expect(jwt.sign).toHaveBeenCalledWith(\n        {\n          userId: mockUser.id,\n          username: mockUser.username,\n          email: mockUser.email,\n          role: mockUser.role,\n        },\n        expect.any(String),\n        { expiresIn: \'7d\' }\n      )');

  // 10. Fix incomplete orderBy clauses
  fixed = fixed.replace(/orderBy: \{ createdAt: 'desc' \},\s*\}\)$/gm, 'orderBy: { createdAt: \'desc\' },\n      })');

  // 11. Fix malformed metadata objects in audit logs
  fixed = fixed.replace(/metadata\): \{\s*type: 'manual-execution',\s*expiredCount: 1\)\s*\}\)$/gm,
    'metadata: {\n          type: \'manual-execution\',\n          expiredCount: 1\n        }\n      })');

  // 12. Fix incomplete describe/it block structures
  fixed = fixed.replace(/\}\)\s*\}\)\s*it\(/gm, '})\n  })\n\n  it(');
  fixed = fixed.replace(/\}\)\s*it\(/gm, '})\n\n    it(');

  // 13. Fix missing closing braces in describe blocks
  fixed = fixed.replace(/describe\('[^']*', \(\) => \{\s*\}\)\s*it\(/gm, (match) => {
    const describeMatch = match.match(/describe\('([^']*)', \(\) => \{\s*\}\)/);
    if (describeMatch) {
      return `describe('${describeMatch[1]}', () => {\n    it(`;
    }
    return match;
  });

  // 14. Fix missing imports that cause ) after import statements
  fixed = fixed.replace(/\}\)\)\nconst mockResponses/gm, '})\n}))\n\nconst mockResponses');
  fixed = fixed.replace(/\}\)\nimport \{/gm, '})\n\nimport {');

  // 15. Fix missing closing parentheses in global fetch mock
  fixed = fixed.replace(/global\.fetch = jest\.fn\(\(\) =>\s*Promise\.resolve\(\{\s*ok: true,\s*json: async \(\) => \(\{\}\),\s*status: 200,\s*\}\)\s*$/gm,
    'global.fetch = jest.fn(() =>\n  Promise.resolve({\n    ok: true,\n    json: async () => ({}),\n    status: 200,\n  })\n) as jest.Mock');

  // 16. Remove excessive closing braces at file ends
  fixed = fixed.replace(/\}\s*\}\s*$/gm, '}');

  return { fixed, hasChanges };
}

// Process files in batches
const batchSize = 15;
for (let i = 0; i < testFiles.length; i += batchSize) {
  const batch = testFiles.slice(i, i + batchSize);
  
  console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(testFiles.length/batchSize)} (${batch.length} files)...`);
  
  for (const file of batch) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const { fixed, hasChanges } = fixSyntaxErrors(content);
      
      if (hasChanges) {
        fs.writeFileSync(file, fixed);
        totalFixed++;
        console.log(`  ✅ Fixed: ${file}`);
      }
      
      processedFiles++;
    } catch (error) {
      console.error(`  ❌ Error processing ${file}:`, error.message);
    }
  }
}

console.log(`\n📊 Final Cleanup Summary:`);
console.log(`   Processed: ${processedFiles} files`);
console.log(`   Fixed: ${totalFixed} files`);
console.log(`   Success rate: ${Math.round((processedFiles / testFiles.length) * 100)}%`);

if (totalFixed > 0) {
  console.log(`\n🎉 Final syntax cleanup complete! Fixed ${totalFixed} files.`);
} else {
  console.log(`\n✨ All files appear to be syntactically correct already.`);
}