#!/usr/bin/env npx tsx

import { readFile, writeFile } from 'fs/promises';

async function fixSalesCasesPage() {
  console.warn('🔧 Fixing Sales Cases Page toFixed Error\n');
  
  const filePath = '/Users/irtizahassan/apps/enxi/enxi-erp/app/(auth)/sales-cases/page.tsx';
  
  try {
    console.warn('1. Reading current file...');
    const content = await readFile(filePath, 'utf8');
    
    console.warn('2. Identifying problematic lines...');
    const problematicLines = [
      'metrics.averageWinRate.toFixed(1)',
      'metrics.averageMargin.toFixed(1)',
      'salesCase.profitMargin.toFixed(1)'
    ];
    
    let fixedContent = content;
    let fixCount = 0;
    
    console.warn('3. Applying null-safe fixes...');
    
    // Fix 1: averageWinRate.toFixed(1)
    const winRatePattern = /metrics\.averageWinRate\.toFixed\(1\)/g;
    if (winRatePattern.test(content)) {
      fixedContent = fixedContent.replace(
        winRatePattern,
        '(metrics.averageWinRate ?? 0).toFixed(1)'
      );
      fixCount++;
      console.warn('   ✅ Fixed averageWinRate.toFixed()');
    }
    
    // Fix 2: averageMargin.toFixed(1)
    const marginPattern = /metrics\.averageMargin\.toFixed\(1\)/g;
    if (marginPattern.test(fixedContent)) {
      fixedContent = fixedContent.replace(
        marginPattern,
        '(metrics.averageMargin ?? 0).toFixed(1)'
      );
      fixCount++;
      console.warn('   ✅ Fixed averageMargin.toFixed()');
    }
    
    // Fix 3: profitMargin.toFixed(1) 
    const profitMarginPattern = /salesCase\.profitMargin\.toFixed\(1\)/g;
    if (profitMarginPattern.test(fixedContent)) {
      fixedContent = fixedContent.replace(
        profitMarginPattern,
        '(salesCase.profitMargin ?? 0).toFixed(1)'
      );
      fixCount++;
      console.warn('   ✅ Fixed profitMargin.toFixed()');
    }
    
    // Additional safety checks - make sure all numeric fields have fallbacks
    console.warn('4. Adding additional safety checks...');
    
    // Check for other potential null numeric operations
    const additionalFixes = [
      {
        pattern: /metrics\.totalCases(?!\?)/g,
        replacement: '(metrics.totalCases ?? 0)',
        name: 'totalCases'
      },
      {
        pattern: /metrics\.openCases(?!\?)/g,
        replacement: '(metrics.openCases ?? 0)',
        name: 'openCases'
      },
      {
        pattern: /metrics\.wonCases(?!\?)/g,
        replacement: '(metrics.wonCases ?? 0)',
        name: 'wonCases'
      },
      {
        pattern: /metrics\.lostCases(?!\?)/g,
        replacement: '(metrics.lostCases ?? 0)',
        name: 'lostCases'
      }
    ];
    
    additionalFixes.forEach(fix => {
      if (fix.pattern.test(fixedContent)) {
        fixedContent = fixedContent.replace(fix.pattern, fix.replacement);
        fixCount++;
        console.warn(`   ✅ Added null safety for ${fix.name}`);
      }
    });
    
    if (fixCount > 0) {
      console.warn('\n5. Creating backup...');
      const backupPath = filePath + '.backup.' + new Date().toISOString().replace(/[:.]/g, '-');
      await writeFile(backupPath, content, 'utf8');
      console.warn(`   📄 Backup created: ${backupPath}`);
      
      console.warn('\n6. Writing fixed file...');
      await writeFile(filePath, fixedContent, 'utf8');
      console.warn('   ✅ File updated successfully');
      
      console.warn(`\n🎉 FIXED ${fixCount} ISSUES:`);
      console.warn('   - Added null safety to .toFixed() calls');
      console.warn('   - Added fallbacks for numeric metrics');
      console.warn('   - Prevented "Cannot read properties of null" errors');
      
      console.warn('\n📋 CHANGES MADE:');
      console.warn('   - metrics.averageWinRate.toFixed(1) → (metrics.averageWinRate ?? 0).toFixed(1)');
      console.warn('   - metrics.averageMargin.toFixed(1) → (metrics.averageMargin ?? 0).toFixed(1)');
      console.warn('   - salesCase.profitMargin.toFixed(1) → (salesCase.profitMargin ?? 0).toFixed(1)');
      console.warn('   - Added null safety for other numeric fields');
      
      console.warn('\n🔍 WHY THIS FIXES THE ISSUE:');
      console.warn('   - The error occurred because API returned null values');
      console.warn('   - ?? 0 provides a default value of 0 when the property is null/undefined');
      console.warn('   - This prevents the "Cannot read properties of null" error');
      console.warn('   - Numbers display as "0.0%" instead of crashing');
      
      console.warn('\n✅ SOLUTION COMPLETE!');
      console.warn('   The page should now load without errors.');
      console.warn('   Visit: http://localhost:3000/sales-cases');
      
    } else {
      console.warn('\n🤔 No toFixed() issues found in the file.');
      console.warn('   The error might be in a different location or already fixed.');
    }
    
  } catch (error: any) {
    console.error('\n❌ Fix failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

fixSalesCasesPage();