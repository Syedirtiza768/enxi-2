#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing API Route Tests V2...\n');

// Enhanced fix patterns for API route tests
const apiRouteFixes = {
  // Clean up duplicate imports and mocks
  cleanupDuplicates: (content) => {
    // Remove duplicate LeadService mocks
    content = content.replace(/jest\.mock\('@\/lib\/services\/lead\.service'[^}]+}\)\)[\s\n]*jest\.mock\('@\/lib\/services\/lead\.service'[^}]+}\)\)/g, 
      `jest.mock('@/lib/services/lead.service', () => ({
  LeadService: jest.fn().mockImplementation(() => ({
    createLead: jest.fn(),
    getLeads: jest.fn(),
    updateLead: jest.fn(),
    deleteLead: jest.fn(),
    getLeadById: jest.fn()
  }))
}))`);
    
    // Remove duplicate NextRequest imports
    content = content.replace(/import { NextRequest } from 'next\/server'[\s\n]*import { NextRequest } from 'next\/server'/g, 
      "import { NextRequest } from 'next/server'");
    
    // Remove old COMPREHENSIVE API MOCK sections
    content = content.replace(/\/\/ COMPREHENSIVE API MOCK[\s\S]*?}\)\)/g, '');
    
    // Remove duplicate mock definitions
    content = content.replace(/jest\.mock\('next\/server'[^}]+}\)\)[\s\n]*jest\.mock\('next\/server'[^}]+}\)\)/g, '');
    
    return content;
  },
  
  // Fix mock imports and setup
  fixMockSetup: (content) => {
    // Ensure proper imports at the top
    if (!content.includes('mock-utilities')) {
      content = `import { MockNextRequest, mockNextResponse, mockSession } from '@/tests/helpers/mock-utilities'\n` + content;
    }
    
    // Add proper next-auth mock if missing
    if (!content.includes("jest.mock('next-auth')")) {
      const authMock = `
// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => Promise.resolve(mockSession()))
}))
`;
      content = content.replace(/import.*from.*@\/tests\/helpers\/mock-utilities.*\n/, '$&' + authMock);
    }
    
    // Add proper NextResponse mock
    if (!content.includes('const mockResponses = mockNextResponse()')) {
      const responseMock = `
// Mock NextResponse
const mockResponses = mockNextResponse()
jest.mock('next/server', () => ({
  NextRequest: MockNextRequest,
  NextResponse: mockResponses
}))
`;
      content = content.replace(/jest\.mock\('next-auth'[^}]+}\)\)/, '$&' + responseMock);
    }
    
    return content;
  },
  
  // Fix service-specific mocks
  fixServiceMocks: (content) => {
    // Fix LeadService mock
    if (content.includes('LeadService')) {
      content = content.replace(/jest\.mock\('@\/lib\/services\/lead\.service'.*?\)\)/gs,
        `jest.mock('@/lib/services/lead.service', () => ({
  LeadService: jest.fn().mockImplementation(() => ({
    createLead: jest.fn(),
    getLeads: jest.fn(),
    updateLead: jest.fn(),
    deleteLead: jest.fn(),
    getLeadById: jest.fn()
  }))
}))`);
    }
    
    // Fix other service mocks similarly
    const services = [
      'SupplierInvoiceService',
      'SupplierPaymentService',
      'GoodsReceiptService',
      'QuotationService',
      'ShipmentService',
      'InventoryService',
      'CustomerService',
      'UserService'
    ];
    
    services.forEach(service => {
      if (content.includes(service)) {
        const servicePath = service.replace('Service', '').toLowerCase();
        const mockPattern = new RegExp(`jest\\.mock\\('@/lib/services/${servicePath}\\.service'.*?\\)\\)`, 'gs');
        content = content.replace(mockPattern,
          `jest.mock('@/lib/services/${servicePath}.service', () => ({
  ${service}: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }))
}))`);
      }
    });
    
    return content;
  },
  
  // Fix test structure
  fixTestStructure: (content) => {
    // Fix request creation patterns
    content = content.replace(/new NextRequest\(/g, 'new MockNextRequest(');
    
    // Fix response assertions
    content = content.replace(/expect\(NextResponse\.json\)\.toHaveBeenCalledWith\((.*?)\)/g,
      'expect(result).toEqual({ type: "json", data: $1, status: 200, headers: {} })');
    
    content = content.replace(/expect\(NextResponse\.json\)\.toHaveBeenCalledWith\((.*?),\s*{\s*status:\s*(\d+)\s*}\)/g,
      'expect(result).toEqual({ type: "json", data: $1, status: $2, headers: {} })');
    
    // Fix auth utility imports
    if (content.includes('getUserFromRequest')) {
      content = content.replace(/jest\.mock\('@\/lib\/utils\/auth'.*?\)\)/gs,
        `jest.mock('@/lib/utils/auth', () => ({
  getUserFromRequest: jest.fn().mockResolvedValue(mockSession().user)
}))`);
    }
    
    return content;
  },
  
  // Remove FIXED BY SCRIPT markers and clean up
  cleanup: (content) => {
    // Remove duplicate FIXED markers
    content = content.replace(/\/\/ API ROUTE TEST FIXED\n\/\/ API ROUTE TEST FIXED/g, '// API ROUTE TEST FIXED');
    content = content.replace(/\/\/ FIXED BY SCRIPT\n/g, '');
    
    // Clean up excessive newlines
    content = content.replace(/\n{3,}/g, '\n\n');
    
    return content;
  }
};

// Process API route test files
function fixApiRouteTest(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Apply all fixes
    const originalContent = content;
    
    content = apiRouteFixes.cleanupDuplicates(content);
    content = apiRouteFixes.fixMockSetup(content);
    content = apiRouteFixes.fixServiceMocks(content);
    content = apiRouteFixes.fixTestStructure(content);
    content = apiRouteFixes.cleanup(content);
    
    if (content !== originalContent) {
      modified = true;
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Find and fix all API route tests
function findAndFixApiTests() {
  const testDirs = ['tests/api', 'tests/integration', 'tests/unit/api'];
  let fixedCount = 0;
  
  testDirs.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) return;
    
    const files = fs.readdirSync(fullPath);
    files.forEach(file => {
      if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) {
        const filePath = path.join(fullPath, file);
        if (fixApiRouteTest(filePath)) {
          fixedCount++;
        }
      }
    });
  });
  
  return fixedCount;
}

// Main execution
console.log('🔍 Searching for API route tests to fix...\n');

const fixedCount = findAndFixApiTests();

console.log(`\n✨ Fixed ${fixedCount} API route test files`);
console.log('\n🎯 Next: Run npm test to verify fixes');