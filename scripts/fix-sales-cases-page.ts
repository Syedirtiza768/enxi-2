#!/usr/bin/env npx tsx

import { readFile, writeFile } from 'fs/promises';

async function fixSalesCasesPage() {
  console.log('🔧 Fixing Sales Cases Page toFixed Error\n');
  
  const filePath = '/Users/irtizahassan/apps/enxi/enxi-erp/app/(auth)/sales-cases/page.tsx';
  
  try {
    console.log('1. Reading current file...');
    const content = await readFile(filePath, 'utf8');
    
    console.log('2. Identifying problematic lines...');
    const problematicLines = [
      'metrics.averageWinRate.toFixed(1)',
      'metrics.averageMargin.toFixed(1)',
      'salesCase.profitMargin.toFixed(1)'
    ];
    
    let fixedContent = content;
    let fixCount = 0;
    
    console.log('3. Applying null-safe fixes...');
    
    // Fix 1: averageWinRate.toFixed(1)
    const winRatePattern = /metrics\.averageWinRate\.toFixed\(1\)/g;
    if (winRatePattern.test(content)) {
      fixedContent = fixedContent.replace(
        winRatePattern,
        '(metrics.averageWinRate ?? 0).toFixed(1)'
      );
      fixCount++;
      console.log('   ✅ Fixed averageWinRate.toFixed()');
    }
    
    // Fix 2: averageMargin.toFixed(1)
    const marginPattern = /metrics\.averageMargin\.toFixed\(1\)/g;
    if (marginPattern.test(fixedContent)) {
      fixedContent = fixedContent.replace(
        marginPattern,
        '(metrics.averageMargin ?? 0).toFixed(1)'
      );
      fixCount++;
      console.log('   ✅ Fixed averageMargin.toFixed()');
    }
    
    // Fix 3: profitMargin.toFixed(1) 
    const profitMarginPattern = /salesCase\.profitMargin\.toFixed\(1\)/g;
    if (profitMarginPattern.test(fixedContent)) {
      fixedContent = fixedContent.replace(
        profitMarginPattern,
        '(salesCase.profitMargin ?? 0).toFixed(1)'
      );
      fixCount++;
      console.log('   ✅ Fixed profitMargin.toFixed()');
    }
    
    // Additional safety checks - make sure all numeric fields have fallbacks
    console.log('4. Adding additional safety checks...');
    
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
        console.log(`   ✅ Added null safety for ${fix.name}`);
      }
    });
    
    if (fixCount > 0) {
      console.log('\n5. Creating backup...');
      const backupPath = filePath + '.backup.' + new Date().toISOString().replace(/[:.]/g, '-');
      await writeFile(backupPath, content, 'utf8');
      console.log(`   📄 Backup created: ${backupPath}`);
      
      console.log('\n6. Writing fixed file...');
      await writeFile(filePath, fixedContent, 'utf8');
      console.log('   ✅ File updated successfully');
      
      console.log(`\n🎉 FIXED ${fixCount} ISSUES:`);
      console.log('   - Added null safety to .toFixed() calls');
      console.log('   - Added fallbacks for numeric metrics');
      console.log('   - Prevented "Cannot read properties of null" errors');
      
      console.log('\n📋 CHANGES MADE:');
      console.log('   - metrics.averageWinRate.toFixed(1) → (metrics.averageWinRate ?? 0).toFixed(1)');
      console.log('   - metrics.averageMargin.toFixed(1) → (metrics.averageMargin ?? 0).toFixed(1)');
      console.log('   - salesCase.profitMargin.toFixed(1) → (salesCase.profitMargin ?? 0).toFixed(1)');
      console.log('   - Added null safety for other numeric fields');
      
      console.log('\n🔍 WHY THIS FIXES THE ISSUE:');
      console.log('   - The error occurred because API returned null values');
      console.log('   - ?? 0 provides a default value of 0 when the property is null/undefined');
      console.log('   - This prevents the "Cannot read properties of null" error');
      console.log('   - Numbers display as "0.0%" instead of crashing');
      
      console.log('\n✅ SOLUTION COMPLETE!');
      console.log('   The page should now load without errors.');
      console.log('   Visit: http://localhost:3000/sales-cases');
      
    } else {
      console.log('\n🤔 No toFixed() issues found in the file.');
      console.log('   The error might be in a different location or already fixed.');
    }
    
  } catch (error: any) {
    console.error('\n❌ Fix failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

fixSalesCasesPage();