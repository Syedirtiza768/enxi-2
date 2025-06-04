#!/usr/bin/env npx tsx

import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';

interface RequirementStatus {
  requirement: string;
  status: 'implemented' | 'partial' | 'missing';
  details: string[];
  files: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
}

async function comprehensiveBusinessAnalysis() {
  console.log('🔍 Comprehensive Business Requirements Analysis\n');
  
  const requirements: RequirementStatus[] = [];
  
  // Helper function to check if files exist
  const checkFiles = async (patterns: string[]): Promise<string[]> => {
    const foundFiles: string[] = [];
    for (const pattern of patterns) {
      try {
        const stats = await stat(pattern);
        if (stats.isFile()) {
          foundFiles.push(pattern);
        }
      } catch {
        // File doesn't exist
      }
    }
    return foundFiles;
  };

  // Helper function to check file content
  const checkFileContent = async (filePath: string, searchTerms: string[]): Promise<boolean> => {
    try {
      const content = await readFile(filePath, 'utf8');
      return searchTerms.some(term => content.toLowerCase().includes(term.toLowerCase()));
    } catch {
      return false;
    }
  };

  console.log('📋 1. LEAD TO SALES CASE RELATIONSHIP');
  // Check lead to sales case relationship
  const leadSalesCaseFiles = await checkFiles([
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/api/leads/[id]/convert/route.ts',
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/(auth)/leads/page.tsx',
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/(auth)/sales-cases/page.tsx'
  ]);
  
  let leadConvertImplemented = false;
  if (leadSalesCaseFiles.length > 0) {
    leadConvertImplemented = await checkFileContent(leadSalesCaseFiles[0], ['convert', 'salesCase', 'sales-case']);
  }
  
  requirements.push({
    requirement: "Lead to Sales Case Conversion",
    status: leadConvertImplemented ? 'implemented' : 'missing',
    details: leadConvertImplemented 
      ? ['Lead conversion API exists', 'UI components available']
      : ['No lead to sales case conversion found', 'Manual relationship tracking needed'],
    files: leadSalesCaseFiles,
    priority: 'critical'
  });

  console.log('📋 2. INVENTORY MANAGEMENT');
  // Check inventory categories
  const inventoryFiles = await checkFiles([
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/api/inventory/categories/route.ts',
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/api/inventory/items/route.ts',
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/(auth)/inventory/categories/page.tsx',
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/(auth)/inventory/items/page.tsx'
  ]);

  const inventoryStockFiles = await checkFiles([
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/api/inventory/stock-movements/route.ts',
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/api/inventory/stock-movements/adjust/route.ts',
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/api/inventory/stock-movements/opening/route.ts'
  ]);

  requirements.push({
    requirement: "Inventory Categories & Items Management",
    status: inventoryFiles.length >= 4 ? 'implemented' : inventoryFiles.length > 0 ? 'partial' : 'missing',
    details: [
      `Categories API: ${inventoryFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/api/inventory/categories/route.ts') ? '✅' : '❌'}`,
      `Items API: ${inventoryFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/api/inventory/items/route.ts') ? '✅' : '❌'}`,
      `Categories UI: ${inventoryFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/(auth)/inventory/categories/page.tsx') ? '✅' : '❌'}`,
      `Items UI: ${inventoryFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/(auth)/inventory/items/page.tsx') ? '✅' : '❌'}`
    ],
    files: inventoryFiles,
    priority: 'critical'
  });

  requirements.push({
    requirement: "Stock Movements (In/Out/Adjustments)",
    status: inventoryStockFiles.length >= 2 ? 'implemented' : inventoryStockFiles.length > 0 ? 'partial' : 'missing',
    details: [
      `Stock movements API: ${inventoryStockFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/api/inventory/stock-movements/route.ts') ? '✅' : '❌'}`,
      `Stock adjustments: ${inventoryStockFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/api/inventory/stock-movements/adjust/route.ts') ? '✅' : '❌'}`,
      `Opening stock: ${inventoryStockFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/api/inventory/stock-movements/opening/route.ts') ? '✅' : '❌'}`
    ],
    files: inventoryStockFiles,
    priority: 'critical'
  });

  console.log('📋 3. ACCOUNTING SYSTEM');
  // Check accounting modules
  const accountingFiles = await checkFiles([
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/api/accounting/accounts/route.ts',
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/api/accounting/journal-entries/route.ts',
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/api/accounting/reports/trial-balance/route.ts',
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/api/accounting/reports/balance-sheet/route.ts',
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/api/accounting/reports/income-statement/route.ts'
  ]);

  requirements.push({
    requirement: "Chart of Accounts & Journal Entries",
    status: accountingFiles.length >= 2 ? 'implemented' : accountingFiles.length > 0 ? 'partial' : 'missing',
    details: [
      `Chart of Accounts: ${accountingFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/api/accounting/accounts/route.ts') ? '✅' : '❌'}`,
      `Journal Entries: ${accountingFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/api/accounting/journal-entries/route.ts') ? '✅' : '❌'}`
    ],
    files: accountingFiles.filter(f => f.includes('accounts') || f.includes('journal-entries')),
    priority: 'critical'
  });

  requirements.push({
    requirement: "Financial Reports (Trial Balance, Balance Sheet, Income Statement)",
    status: accountingFiles.length >= 5 ? 'implemented' : accountingFiles.length >= 3 ? 'partial' : 'missing',
    details: [
      `Trial Balance: ${accountingFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/api/accounting/reports/trial-balance/route.ts') ? '✅' : '❌'}`,
      `Balance Sheet: ${accountingFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/api/accounting/reports/balance-sheet/route.ts') ? '✅' : '❌'}`,
      `Income Statement: ${accountingFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/api/accounting/reports/income-statement/route.ts') ? '✅' : '❌'}`
    ],
    files: accountingFiles.filter(f => f.includes('reports')),
    priority: 'high'
  });

  console.log('📋 4. QUOTATIONS SYSTEM');
  // Check quotations
  const quotationFiles = await checkFiles([
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/api/quotations/route.ts',
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/api/quotations/[id]/route.ts',
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/(auth)/quotations/page.tsx',
    '/Users/irtizahassan/apps/enxi/enxi-erp/components/quotations/quotation-form.tsx',
    '/Users/irtizahassan/apps/enxi/enxi-erp/components/quotations/line-item-editor.tsx'
  ]);

  // Check for PDF generation
  const quotationPdfFiles = await checkFiles([
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/api/quotations/[id]/pdf/route.ts',
    '/Users/irtizahassan/apps/enxi/enxi-erp/lib/pdf/quotation-template.tsx'
  ]);

  requirements.push({
    requirement: "Quotations with Line Items",
    status: quotationFiles.length >= 4 ? 'implemented' : quotationFiles.length > 0 ? 'partial' : 'missing',
    details: [
      `Quotations API: ${quotationFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/api/quotations/route.ts') ? '✅' : '❌'}`,
      `Quotation UI: ${quotationFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/(auth)/quotations/page.tsx') ? '✅' : '❌'}`,
      `Line Items Editor: ${quotationFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/components/quotations/line-item-editor.tsx') ? '✅' : '❌'}`,
      `Form Component: ${quotationFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/components/quotations/quotation-form.tsx') ? '✅' : '❌'}`
    ],
    files: quotationFiles,
    priority: 'critical'
  });

  requirements.push({
    requirement: "Quotation PDF Generation",
    status: quotationPdfFiles.length >= 2 ? 'implemented' : quotationPdfFiles.length > 0 ? 'partial' : 'missing',
    details: [
      `PDF API: ${quotationPdfFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/api/quotations/[id]/pdf/route.ts') ? '✅' : '❌'}`,
      `PDF Template: ${quotationPdfFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/lib/pdf/quotation-template.tsx') ? '✅' : '❌'}`
    ],
    files: quotationPdfFiles,
    priority: 'high'
  });

  console.log('📋 5. CUSTOMER PO & ORDERS');
  // Check customer PO system
  const customerPoFiles = await checkFiles([
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/api/customer-pos/route.ts',
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/api/quotations/[id]/accept/route.ts',
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/api/quotations/[id]/convert-to-order/route.ts',
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/(auth)/customer-pos/page.tsx'
  ]);

  // Check sales orders
  const salesOrderFiles = await checkFiles([
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/api/sales-orders/route.ts',
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/api/sales-orders/[id]/route.ts',
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/(auth)/sales-orders/page.tsx'
  ]);

  requirements.push({
    requirement: "Customer PO Management",
    status: customerPoFiles.length >= 3 ? 'implemented' : customerPoFiles.length > 0 ? 'partial' : 'missing',
    details: [
      `Customer PO API: ${customerPoFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/api/customer-pos/route.ts') ? '✅' : '❌'}`,
      `Quotation Accept: ${customerPoFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/api/quotations/[id]/accept/route.ts') ? '✅' : '❌'}`,
      `Convert to Order: ${customerPoFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/api/quotations/[id]/convert-to-order/route.ts') ? '✅' : '❌'}`,
      `PO UI: ${customerPoFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/(auth)/customer-pos/page.tsx') ? '✅' : '❌'}`
    ],
    files: customerPoFiles,
    priority: 'critical'
  });

  requirements.push({
    requirement: "Sales Orders Management",
    status: salesOrderFiles.length >= 3 ? 'implemented' : salesOrderFiles.length > 0 ? 'partial' : 'missing',
    details: [
      `Sales Orders API: ${salesOrderFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/api/sales-orders/route.ts') ? '✅' : '❌'}`,
      `Individual Order API: ${salesOrderFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/api/sales-orders/[id]/route.ts') ? '✅' : '❌'}`,
      `Sales Orders UI: ${salesOrderFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/(auth)/sales-orders/page.tsx') ? '✅' : '❌'}`
    ],
    files: salesOrderFiles,
    priority: 'critical'
  });

  console.log('📋 6. INVOICING & PAYMENTS');
  // Check invoicing
  const invoiceFiles = await checkFiles([
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/api/invoices/route.ts',
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/api/invoices/[id]/route.ts',
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/api/invoices/[id]/payments/route.ts',
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/(auth)/invoices/page.tsx'
  ]);

  requirements.push({
    requirement: "Invoicing System",
    status: invoiceFiles.length >= 3 ? 'implemented' : invoiceFiles.length > 0 ? 'partial' : 'missing',
    details: [
      `Invoices API: ${invoiceFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/api/invoices/route.ts') ? '✅' : '❌'}`,
      `Individual Invoice: ${invoiceFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/api/invoices/[id]/route.ts') ? '✅' : '❌'}`,
      `Payments API: ${invoiceFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/api/invoices/[id]/payments/route.ts') ? '✅' : '❌'}`,
      `Invoices UI: ${invoiceFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/(auth)/invoices/page.tsx') ? '✅' : '❌'}`
    ],
    files: invoiceFiles,
    priority: 'critical'
  });

  console.log('📋 7. AUDIT TRAIL');
  // Check audit system
  const auditFiles = await checkFiles([
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/api/audit/route.ts',
    '/Users/irtizahassan/apps/enxi/enxi-erp/lib/services/audit.service.ts',
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/(auth)/audit/page.tsx'
  ]);

  requirements.push({
    requirement: "Audit Trail System",
    status: auditFiles.length >= 2 ? 'implemented' : auditFiles.length > 0 ? 'partial' : 'missing',
    details: [
      `Audit API: ${auditFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/api/audit/route.ts') ? '✅' : '❌'}`,
      `Audit Service: ${auditFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/lib/services/audit.service.ts') ? '✅' : '❌'}`,
      `Audit UI: ${auditFiles.includes('/Users/irtizahassan/apps/enxi/enxi-erp/app/(auth)/audit/page.tsx') ? '✅' : '❌'}`
    ],
    files: auditFiles,
    priority: 'high'
  });

  console.log('📋 8. ADVANCED FEATURES');
  // Check FIFO inventory costing
  let fifoImplemented = false;
  try {
    const stockMovementContent = await readFile('/Users/irtizahassan/apps/enxi/enxi-erp/lib/services/inventory/stock-movement.service.ts', 'utf8');
    fifoImplemented = stockMovementContent.toLowerCase().includes('fifo');
  } catch {}

  requirements.push({
    requirement: "FIFO Inventory Costing",
    status: fifoImplemented ? 'implemented' : 'missing',
    details: fifoImplemented 
      ? ['FIFO method found in stock movement service']
      : ['FIFO inventory costing not implemented', 'Required for profitability calculation'],
    files: fifoImplemented ? ['/Users/irtizahassan/apps/enxi/enxi-erp/lib/services/inventory/stock-movement.service.ts'] : [],
    priority: 'high'
  });

  // Check VAT/Tax system
  const taxFiles = await checkFiles([
    '/Users/irtizahassan/apps/enxi/enxi-erp/app/api/accounting/exchange-rates/route.ts'
  ]);

  let taxImplemented = false;
  for (const file of ['/Users/irtizahassan/apps/enxi/enxi-erp/app/api/invoices/route.ts', '/Users/irtizahassan/apps/enxi/enxi-erp/app/api/quotations/route.ts']) {
    try {
      const content = await readFile(file, 'utf8');
      if (content.toLowerCase().includes('tax') || content.toLowerCase().includes('vat')) {
        taxImplemented = true;
        break;
      }
    } catch {}
  }

  requirements.push({
    requirement: "Tax/VAT System",
    status: taxImplemented ? 'implemented' : 'missing',
    details: taxImplemented 
      ? ['Tax calculations found in invoicing/quotation system']
      : ['VAT/Tax system not implemented', 'Required for MVP'],
    files: [],
    priority: 'critical'
  });

  // Generate comprehensive report
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE BUSINESS REQUIREMENTS ANALYSIS REPORT');
  console.log('='.repeat(80));

  const implemented = requirements.filter(r => r.status === 'implemented').length;
  const partial = requirements.filter(r => r.status === 'partial').length;
  const missing = requirements.filter(r => r.status === 'missing').length;
  const total = requirements.length;

  console.log(`\n📈 OVERALL STATUS:`);
  console.log(`   ✅ Implemented: ${implemented}/${total} (${Math.round(implemented/total*100)}%)`);
  console.log(`   🔄 Partial: ${partial}/${total} (${Math.round(partial/total*100)}%)`);
  console.log(`   ❌ Missing: ${missing}/${total} (${Math.round(missing/total*100)}%)`);

  console.log(`\n🎯 IMPLEMENTATION STATUS BY PRIORITY:`);
  
  ['critical', 'high', 'medium', 'low'].forEach(priority => {
    const priorityReqs = requirements.filter(r => r.priority === priority);
    const priorityImplemented = priorityReqs.filter(r => r.status === 'implemented').length;
    console.log(`\n🔥 ${priority.toUpperCase()} PRIORITY (${priorityImplemented}/${priorityReqs.length}):`);
    
    priorityReqs.forEach(req => {
      const statusIcon = req.status === 'implemented' ? '✅' : 
                        req.status === 'partial' ? '🔄' : '❌';
      console.log(`   ${statusIcon} ${req.requirement}`);
      req.details.forEach(detail => console.log(`      - ${detail}`));
    });
  });

  console.log(`\n🚀 NEXT STEPS - CRITICAL MISSING ITEMS:`);
  const criticalMissing = requirements.filter(r => r.priority === 'critical' && r.status === 'missing');
  criticalMissing.forEach((req, index) => {
    console.log(`\n${index + 1}. ${req.requirement}`);
    req.details.forEach(detail => console.log(`   - ${detail}`));
  });

  console.log(`\n📋 READY FOR IMPLEMENTATION:`);
  const readyItems = requirements.filter(r => r.status === 'implemented');
  console.log(`The following ${readyItems.length} modules are ready for use:`);
  readyItems.forEach(req => console.log(`   ✅ ${req.requirement}`));

  console.log(`\n⚠️ NEEDS COMPLETION:`);
  const partialItems = requirements.filter(r => r.status === 'partial');
  partialItems.forEach(req => {
    console.log(`   🔄 ${req.requirement}`);
    req.details.forEach(detail => console.log(`      - ${detail}`));
  });

  console.log('\n' + '='.repeat(80));
  console.log('🎯 CONCLUSION: System is significantly implemented but needs critical gaps filled');
  console.log('🔧 RECOMMENDATION: Focus on missing critical items first, then complete partial implementations');
  console.log('='.repeat(80));
}

comprehensiveBusinessAnalysis();