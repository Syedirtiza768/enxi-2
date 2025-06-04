import { RouteInfo } from './route-discovery';

export interface TestScenario {
  name: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
  expectedStatus?: number;
  requiresAuth?: boolean;
  testData?: Record<string, any>;
}

export interface RouteTestResult {
  route: RouteInfo;
  scenario: TestScenario;
  success: boolean;
  statusCode: number;
  responseTime: number;
  error?: string;
  response?: any;
  timestamp: string;
}

export interface TestSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  totalTime: number;
  errorsByCategory: Record<string, number>;
  failedRoutes: RouteTestResult[];
}

export class RouteTester {
  private baseUrl: string;
  private authToken?: string;
  private testResults: RouteTestResult[] = [];

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async authenticate(): Promise<boolean> {
    try {
      console.log('Attempting authentication for route testing');
      
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          password: 'demo123'
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.authToken = data.token;
        console.log('Authentication successful for route testing');
        return true;
      } else {
        console.warn('Authentication failed for route testing', { status: response.status });
        return false;
      }
    } catch (error) {
      console.error('Authentication error during route testing', error);
      return false;
    }
  }

  async testRoute(route: RouteInfo, scenario: TestScenario): Promise<RouteTestResult> {
    const startTime = Date.now();
    
    try {
      // Generate test URL
      const testUrl = this.generateTestUrl(route, scenario);
      
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'RouteTestEngine/1.0',
        ...scenario.headers
      };

      // Add auth token if required
      if (scenario.requiresAuth && this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      // Make request
      const fetchOptions: RequestInit = {
        method: scenario.method,
        headers,
        ...(scenario.body && { body: JSON.stringify(scenario.body) })
      };

      const response = await fetch(testUrl, fetchOptions);
      const responseTime = Date.now() - startTime;
      
      // Try to parse response
      let responseData;
      try {
        responseData = await response.json();
      } catch {
        responseData = await response.text();
      }

      // Determine success
      const expectedStatus = scenario.expectedStatus || (scenario.requiresAuth && !this.authToken ? 401 : 200);
      const success = response.status === expectedStatus || 
                     (response.status >= 200 && response.status < 300 && !scenario.expectedStatus);

      const result: RouteTestResult = {
        route,
        scenario,
        success,
        statusCode: response.status,
        responseTime,
        response: responseData,
        timestamp: new Date().toISOString()
      };

      if (!success) {
        result.error = `Expected status ${expectedStatus}, got ${response.status}`;
      }

      this.testResults.push(result);
      
      console.log('Route test completed', {
        path: route.path,
        method: scenario.method,
        success,
        statusCode: response.status,
        responseTime
      });

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const result: RouteTestResult = {
        route,
        scenario,
        success: false,
        statusCode: 0,
        responseTime,
        error: errorMessage,
        timestamp: new Date().toISOString()
      };

      this.testResults.push(result);
      
      console.warn('Route test failed with exception', {
        path: route.path,
        method: scenario.method,
        error: errorMessage,
        responseTime
      });

      return result;
    }
  }

  private generateTestUrl(route: RouteInfo, scenario: TestScenario): string {
    let url = this.baseUrl + route.path;
    
    // Replace parameters with test data
    if (route.hasParams && scenario.testData) {
      route.parameters.forEach(param => {
        const testValue = scenario.testData?.[param] || 'test-id';
        url = url.replace(`[${param}]`, encodeURIComponent(testValue.toString()));
      });
    }
    
    return url;
  }

  generateTestScenarios(route: RouteInfo): TestScenario[] {
    const scenarios: TestScenario[] = [];
    
    route.methods.forEach(method => {
      // Basic success scenario
      scenarios.push({
        name: `${method} ${route.path} - Success`,
        method,
        requiresAuth: route.requiresAuth,
        testData: this.generateTestData(route)
      });

      // Authentication test if route requires auth
      if (route.requiresAuth) {
        scenarios.push({
          name: `${method} ${route.path} - No Auth`,
          method,
          requiresAuth: false,
          expectedStatus: 401
        });
      }

      // Method-specific scenarios
      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        // Valid data scenario
        scenarios.push({
          name: `${method} ${route.path} - Valid Data`,
          method,
          requiresAuth: route.requiresAuth,
          body: this.generateValidRequestBody(route, method),
          testData: this.generateTestData(route)
        });

        // Invalid data scenario
        scenarios.push({
          name: `${method} ${route.path} - Invalid Data`,
          method,
          requiresAuth: route.requiresAuth,
          body: { invalid: 'data' },
          expectedStatus: 400,
          testData: this.generateTestData(route)
        });
      }

      // Parameter validation for dynamic routes
      if (route.hasParams) {
        scenarios.push({
          name: `${method} ${route.path} - Invalid ID`,
          method,
          requiresAuth: route.requiresAuth,
          testData: { ...this.generateTestData(route), id: 'invalid-id' },
          expectedStatus: route.path.includes('/api/') ? 404 : 200
        });
      }
    });

    return scenarios;
  }

  private generateTestData(route: RouteInfo): Record<string, any> {
    const testData: Record<string, any> = {};
    
    route.parameters.forEach(param => {
      switch (param) {
        case 'id':
          testData[param] = 'test-id-123';
          break;
        case 'quotationNumber':
          testData[param] = 'QUO-001';
          break;
        case 'salesCaseId':
          testData[param] = 'case-123';
          break;
        default:
          testData[param] = `test-${param}`;
      }
    });

    return testData;
  }

  private generateValidRequestBody(route: RouteInfo, method: string): any {
    const path = route.path.toLowerCase();
    
    // Generate realistic test data based on route path
    if (path.includes('lead')) {
      return {
        firstName: 'Test',
        lastName: 'Lead',
        email: `test-${Date.now()}@example.com`,
        phone: '+1234567890',
        company: 'Test Company',
        source: 'WEBSITE'
      };
    }
    
    if (path.includes('customer')) {
      return {
        name: 'Test Customer',
        email: `customer-${Date.now()}@example.com`,
        phone: '+1234567890',
        address: '123 Test Street'
      };
    }
    
    if (path.includes('quotation')) {
      return {
        customerId: 'test-customer-id',
        salesCaseId: 'test-case-id',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        lineItems: [
          {
            description: 'Test Item',
            quantity: 1,
            unitPrice: 100.00
          }
        ]
      };
    }
    
    if (path.includes('inventory/item')) {
      return {
        name: 'Test Item',
        sku: `TEST-${Date.now()}`,
        categoryId: 'test-category-id',
        unitPrice: 50.00,
        description: 'Test item description'
      };
    }
    
    if (path.includes('inventory/categor')) {
      return {
        name: 'Test Category',
        description: 'Test category description',
        parentId: null
      };
    }
    
    // Generic test data
    return {
      name: 'Test Entity',
      description: 'Test entity description',
      status: 'ACTIVE'
    };
  }

  async testAllRoutes(routes: RouteInfo[]): Promise<TestSummary> {
    const startTime = Date.now();
    this.testResults = [];
    
    console.log('Starting comprehensive route testing', {
      totalRoutes: routes.length
    });

    // Authenticate first
    const authSuccess = await this.authenticate();
    if (!authSuccess) {
      console.warn('Authentication failed - some tests may fail');
    }

    let testCount = 0;
    for (const route of routes) {
      const scenarios = this.generateTestScenarios(route);
      
      for (const scenario of scenarios) {
        testCount++;
        console.log(`Testing ${testCount}: ${scenario.name}`);
        
        await this.testRoute(route, scenario);
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const totalTime = Date.now() - startTime;
    const summary = this.generateTestSummary(totalTime);
    
    console.log('Route testing completed', {
      totalTests: summary.totalTests,
      passed: summary.passed,
      failed: summary.failed,
      totalTime: summary.totalTime,
      successRate: Math.round((summary.passed / summary.totalTests) * 100)
    });

    return summary;
  }

  private generateTestSummary(totalTime: number): TestSummary {
    const passed = this.testResults.filter(r => r.success).length;
    const failed = this.testResults.filter(r => !r.success).length;
    const failedRoutes = this.testResults.filter(r => !r.success);
    
    // Categorize errors
    const errorsByCategory: Record<string, number> = {};
    failedRoutes.forEach(result => {
      let category = 'Other';
      
      if (result.statusCode === 401) category = 'Authentication';
      else if (result.statusCode === 403) category = 'Authorization';
      else if (result.statusCode === 404) category = 'Not Found';
      else if (result.statusCode === 400) category = 'Validation';
      else if (result.statusCode >= 500) category = 'Server Error';
      else if (result.error) category = 'Network/Connection';
      
      errorsByCategory[category] = (errorsByCategory[category] || 0) + 1;
    });

    return {
      totalTests: this.testResults.length,
      passed,
      failed,
      skipped: 0,
      totalTime,
      errorsByCategory,
      failedRoutes
    };
  }

  getTestResults(): RouteTestResult[] {
    return this.testResults;
  }

  getFailedRoutes(): RouteTestResult[] {
    return this.testResults.filter(r => !r.success);
  }

  exportResults(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['Route', 'Method', 'Status', 'Success', 'Response Time', 'Error'];
      const rows = this.testResults.map(r => [
        r.route.path,
        r.scenario.method,
        r.statusCode.toString(),
        r.success.toString(),
        `${r.responseTime}ms`,
        r.error || ''
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    } else {
      return JSON.stringify(this.testResults, null, 2);
    }
  }
}

export const routeTester = new RouteTester();