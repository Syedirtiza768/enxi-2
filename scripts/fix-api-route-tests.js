#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing API Route Tests...\n');

// Template for API route test fixes
const apiRouteTestTemplate = `import { MockNextRequest, mockNextResponse, mockSession } from '@/tests/helpers/mock-utilities'
import { prisma } from '@/lib/db/prisma'

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => Promise.resolve(mockSession()))
}))

// Mock NextResponse
jest.mock('next/server', () => ({
  NextRequest: MockNextRequest,
  NextResponse: mockNextResponse()
}))
`;

// Fix patterns for API route tests
const apiRouteFixes = {
  // Fix Next.js imports
  fixNextImports: (content) => {
    // Remove duplicate mocks
    content = content.replace(/jest\.mock\('next\/server'[^)]*\)[^;]*;[\s\n]*jest\.mock\('next\/server'[^)]*\)[^;]*;/g, '');
    
    // Add proper imports if missing
    if (!content.includes('mock-utilities')) {
      const importStatement = `import { MockNextRequest, mockNextResponse, mockSession } from '@/tests/helpers/mock-utilities'\n`;
      content = importStatement + content;
    }
    
    return content;
  },
  
  // Fix request creation
  fixRequestCreation: (content) => {
    // Replace new NextRequest with MockNextRequest
    content = content.replace(
      /new NextRequest\((.*?)\)/g,
      'new MockNextRequest($1)'
    );
    
    // Fix request body handling
    content = content.replace(
      /const request = new MockNextRequest\((.*?)\)[\s\n]*request\.json = jest\.fn\(\)\.mockResolvedValue\((.*?)\)/g,
      'const request = new MockNextRequest($1, { body: $2 })'
    );
    
    return content;
  },
  
  // Fix response assertions
  fixResponseAssertions: (content) => {
    // Fix NextResponse.json assertions
    content = content.replace(
      /expect\(NextResponse\.json\)\.toHaveBeenCalledWith\((.*?)\)/g,
      'expect(result).toEqual({ type: "json", data: $1, status: 200, headers: {} })'
    );
    
    // Fix status assertions
    content = content.replace(
      /expect\(NextResponse\.json\)\.toHaveBeenCalledWith\((.*?),\s*{\s*status:\s*(\d+)\s*}\)/g,
      'expect(result).toEqual({ type: "json", data: $1, status: $2, headers: {} })'
    );
    
    return content;
  },
  
  // Fix auth mocking
  fixAuthMocking: (content) => {
    // Ensure getServerSession is mocked properly
    if (!content.includes("jest.mock('next-auth')")) {
      const authMock = `
// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => Promise.resolve(mockSession()))
}))
`;
      content = content.replace(/import.*from.*next-auth.*\n/, '$&' + authMock);
    }
    
    return content;
  },
  
  // Fix service mocking
  fixServiceMocking: (content) => {
    // Find service imports and mock them
    const serviceImports = content.match(/import.*Service.*from.*services.*/g) || [];
    
    serviceImports.forEach(importLine => {
      const serviceName = importLine.match(/{\s*(\w+Service)\s*}/)?.[1];
      if (serviceName && !content.includes(`jest.mock.*${serviceName}`)) {
        const mockCode = `
jest.mock('@/lib/services/${serviceName.replace('Service', '').toLowerCase()}.service', () => ({
  ${serviceName}: jest.fn().mockImplementation(() => ({
    // Add mock methods as needed
  }))
}))
`;
        content = importLine + mockCode + '\n' + content.replace(importLine, '');
      }
    });
    
    return content;
  }
};

// Process API route test files
function fixApiRouteTest(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Skip if already fixed
    if (content.includes('// API ROUTE TEST FIXED')) {
      return false;
    }
    
    // Apply fixes
    const originalContent = content;
    
    content = apiRouteFixes.fixNextImports(content);
    content = apiRouteFixes.fixRequestCreation(content);
    content = apiRouteFixes.fixResponseAssertions(content);
    content = apiRouteFixes.fixAuthMocking(content);
    content = apiRouteFixes.fixServiceMocking(content);
    
    // Add fixed marker
    if (content !== originalContent) {
      content = '// API ROUTE TEST FIXED\n' + content;
      modified = true;
    }
    
    if (modified) {
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

// Create example fixed API route test
const exampleApiTest = `// API ROUTE TEST FIXED
import { MockNextRequest, mockNextResponse, mockSession } from '@/tests/helpers/mock-utilities'
import { prisma } from '@/lib/db/prisma'
import { GET, POST } from '@/app/api/leads/route'
import { LeadService } from '@/lib/services/lead.service'

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => Promise.resolve(mockSession()))
}))

// Mock NextResponse
const mockResponses = mockNextResponse()
jest.mock('next/server', () => ({
  NextRequest: MockNextRequest,
  NextResponse: mockResponses
}))

// Mock LeadService
jest.mock('@/lib/services/lead.service', () => ({
  LeadService: jest.fn().mockImplementation(() => ({
    createLead: jest.fn(),
    getLeads: jest.fn(),
    updateLead: jest.fn(),
    deleteLead: jest.fn()
  }))
}))

describe('Lead API Routes', () => {
  let mockLeadService: any
  
  beforeEach(() => {
    jest.clearAllMocks()
    mockLeadService = new LeadService()
  })
  
  describe('GET /api/leads', () => {
    it('should return leads successfully', async () => {
      const mockLeads = [
        { id: '1', firstName: 'John', lastName: 'Doe' }
      ]
      
      mockLeadService.getLeads.mockResolvedValue({
        data: mockLeads,
        total: 1
      })
      
      const request = new MockNextRequest('http://localhost:3000/api/leads')
      const result = await GET(request as any)
      
      expect(result).toEqual({
        type: 'json',
        data: { data: mockLeads, total: 1 },
        status: 200,
        headers: {}
      })
    })
  })
  
  describe('POST /api/leads', () => {
    it('should create lead successfully', async () => {
      const leadData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      }
      
      const mockCreatedLead = { id: '1', ...leadData }
      mockLeadService.createLead.mockResolvedValue(mockCreatedLead)
      
      const request = new MockNextRequest('http://localhost:3000/api/leads', {
        method: 'POST',
        body: leadData
      })
      
      const result = await POST(request as any)
      
      expect(result).toEqual({
        type: 'json',
        data: mockCreatedLead,
        status: 201,
        headers: {}
      })
    })
  })
})
`;

// Save example
fs.writeFileSync(
  path.join(process.cwd(), 'tests/examples/api-route-test-example.ts'),
  exampleApiTest
);

// Main execution
console.log('🔍 Searching for API route tests...\n');

const fixedCount = findAndFixApiTests();

console.log(`\n✨ Fixed ${fixedCount} API route test files`);
console.log('\n📄 Example test created at: tests/examples/api-route-test-example.ts');
console.log('\n🎯 Next: Run npm test to verify fixes');