#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Function to fix mock syntax errors
function fixMockSyntaxErrors(content) {
  let fixed = content;
  let changesMade = false;

  // Fix patterns with specific issues
  const patterns = [
    // Fix .mockResolvedValue({ value: 1 without closing
    {
      pattern: /\.mockResolvedValue\(\{\s*value:\s*1(?!\s*\})/g,
      replacement: '.mockResolvedValue({ value: 1 })'
    },
    // Fix .toHaveBeenCalledWith({ with missing closing brackets
    {
      pattern: /\.toHaveBeenCalledWith\(\{([^}]*?)(?=\n\s*(?:it|describe|test|expect|const|let|var|\/\/|$))/gm,
      replacement: (match, content) => {
        // Count opening and closing braces
        const openCount = (content.match(/\{/g) || []).length;
        const closeCount = (content.match(/\}/g) || []).length;
        const missingBraces = openCount - closeCount;
        
        if (missingBraces > 0) {
          const closing = '}'.repeat(missingBraces) + ')';
          return `.toHaveBeenCalledWith({${content}${closing}`;
        }
        return match;
      }
    },
    // Fix .toEqual({ with missing closing brackets
    {
      pattern: /\.toEqual\(\{([^}]*?)(?=\n\s*(?:it|describe|test|expect|const|let|var|\/\/|$))/gm,
      replacement: (match, content) => {
        const openCount = (content.match(/\{/g) || []).length;
        const closeCount = (content.match(/\}/g) || []).length;
        const missingBraces = openCount - closeCount;
        
        if (missingBraces > 0) {
          const closing = '}'.repeat(missingBraces) + ')';
          return `.toEqual({${content}${closing}`;
        }
        return match;
      }
    },
    // Fix .mockReturnValue({ with missing closing brackets
    {
      pattern: /\.mockReturnValue\(\{([^}]*?)(?=\n\s*(?:it|describe|test|expect|const|let|var|\/\/|$))/gm,
      replacement: (match, content) => {
        const openCount = (content.match(/\{/g) || []).length;
        const closeCount = (content.match(/\}/g) || []).length;
        const missingBraces = openCount - closeCount;
        
        if (missingBraces > 0) {
          const closing = '}'.repeat(missingBraces) + ')';
          return `.mockReturnValue({${content}${closing}`;
        }
        return match;
      }
    },
    // Fix expect.any(Date without closing parenthesis
    {
      pattern: /expect\.any\(Date(?!\))/g,
      replacement: 'expect.any(Date)'
    },
    // Fix orderBy: { createdAt: 'desc' without closing
    {
      pattern: /orderBy:\s*\{\s*createdAt:\s*'desc'(?!\s*\})/g,
      replacement: "orderBy: { createdAt: 'desc' }"
    },
    // Fix lines ending with opening parenthesis but no closing
    {
      pattern: /jest\.restoreAllMocks\((?!\))/g,
      replacement: 'jest.restoreAllMocks()'
    },
    // Fix .mockResolvedValue with incomplete objects
    {
      pattern: /\.mockResolvedValue\(\{([^}]*?)(?=\n\s*\}?\s*\)?\s*$)/gm,
      replacement: (match, content) => {
        if (!match.includes('})')) {
          const lines = content.split('\n');
          const lastLine = lines[lines.length - 1];
          
          // Check if we need to close the object
          if (lastLine.trim() && !lastLine.trim().endsWith('}')) {
            return `.mockResolvedValue({${content}})`;
          }
        }
        return match;
      }
    }
  ];

  // Apply all patterns
  patterns.forEach(({ pattern, replacement }) => {
    const before = fixed;
    fixed = fixed.replace(pattern, replacement);
    if (before !== fixed) {
      changesMade = true;
    }
  });

  // Fix specific multiline patterns
  // Fix toHaveBeenCalledWith with multiline objects
  fixed = fixed.replace(
    /\.toHaveBeenCalledWith\(\{[\s\S]*?\n\s*where:.*?\n\s*data:[\s\S]*?sentAt:\s*expect\.any\(Date\s*$/gm,
    (match) => {
      if (!match.includes('})')) {
        return match + ')\n        }\n      })';
      }
      return match;
    }
  );

  // Fix findMany calls with incomplete objects
  fixed = fixed.replace(
    /\.toHaveBeenCalledWith\(\{[\s\S]*?orderBy:\s*\{\s*createdAt:\s*'desc'\s*$/gm,
    (match) => {
      if (!match.includes('})')) {
        return match + ' }\n      })';
      }
      return match;
    }
  );

  return { content: fixed, changed: changesMade };
}

// Process files
async function processFiles() {
  const testFiles = glob.sync('tests/**/*.{ts,tsx,js,jsx}', {
    cwd: path.join(__dirname, '..'),
    absolute: true
  });

  const e2eFiles = glob.sync('e2e/**/*.{ts,tsx,js,jsx}', {
    cwd: path.join(__dirname, '..'),
    absolute: true
  });

  const allFiles = [...testFiles, ...e2eFiles];
  let filesFixed = 0;

  for (const file of allFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const { content: fixed, changed } = fixMockSyntaxErrors(content);
      
      if (changed) {
        fs.writeFileSync(file, fixed, 'utf8');
        console.log(`Fixed: ${path.relative(process.cwd(), file)}`);
        filesFixed++;
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  }

  console.log(`\nTotal files fixed: ${filesFixed}`);
}

// Run the script
processFiles().catch(console.error);