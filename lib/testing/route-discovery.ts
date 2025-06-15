import { readdir, stat, readFile } from 'fs/promises';
import { join } from 'path';

export interface RouteInfo {
  path: string;
  type: 'api' | 'page' | 'layout';
  methods: string[];
  filePath: string;
  requiresAuth: boolean;
  hasParams: boolean;
  parameters: string[];
  description?: string;
}

export interface RouteGroup {
  category: string;
  routes: RouteInfo[];
}

export class RouteDiscovery {
  private appDir: string;
  private routes: RouteInfo[] = [];

  constructor(appDir: string = './app') {
    this.appDir = appDir;
  }

  async discoverAllRoutes(): Promise<RouteInfo[]> {
    this.routes = [];
    await this.scanDirectory(this.appDir, '');
    
    console.warn('Route discovery completed', {
      totalRoutes: this.routes.length,
      apiRoutes: this.routes.filter(r => r.type === 'api').length,
      pageRoutes: this.routes.filter(r => r.type === 'page').length,
      layoutRoutes: this.routes.filter(r => r.type === 'layout').length
    });

    return this.routes;
  }

  private async scanDirectory(dir: string, currentPath: string): Promise<void> {
    try {
      const items = await readdir(dir);
      
      for (const item of items) {
        const fullPath = join(dir, item);
        const stats = await stat(fullPath);
        
        if (stats.isDirectory()) {
          // Handle Next.js route groups and special directories
          if (item.startsWith('(') && item.endsWith(')')) {
            // Route group - don't add to path
            await this.scanDirectory(fullPath, currentPath);
          } else if (item.startsWith('[') && item.endsWith(']')) {
            // Dynamic route parameter
            const _paramName = item.slice(1, -1);
            const newPath = currentPath + '/' + item;
            await this.scanDirectory(fullPath, newPath);
          } else {
            // Regular directory
            const newPath = currentPath + '/' + item;
            await this.scanDirectory(fullPath, newPath);
          }
        } else if (stats.isFile()) {
          await this.processFile(fullPath, currentPath, item);
        }
      }
} catch {    }
  }

  private async processFile(filePath: string, currentPath: string, fileName: string): Promise<void> {
    if (fileName === 'route.ts' || fileName === 'route.js') {
      // API route
      const route = await this.processApiRoute(filePath, currentPath);
      if (route) this.routes.push(route);
    } else if (fileName === 'page.tsx' || fileName === 'page.jsx' || fileName === 'page.ts' || fileName === 'page.js') {
      // Page route
      const route = await this.processPageRoute(filePath, currentPath);
      if (route) this.routes.push(route);
    } else if (fileName === 'layout.tsx' || fileName === 'layout.jsx' || fileName === 'layout.ts' || fileName === 'layout.js') {
      // Layout route
      const route = await this.processLayoutRoute(filePath, currentPath);
      if (route) this.routes.push(route);
    }
  }

  private async processApiRoute(filePath: string, currentPath: string): Promise<RouteInfo | null> {
    try {
      // Note: Dynamic imports can cause webpack warnings in production builds
      // This is acceptable for testing utilities
      // Skip dynamic imports in production build
      if (process.env.NODE_ENV === 'production') {
        return {
          path: '/api' + currentPath,
          type: 'api',
          methods: ['GET'], // Default assumption
          filePath,
          requiresAuth: await this.checkAuthRequirement(filePath),
          hasParams: this.extractParameters(currentPath).length > 0,
          parameters: this.extractParameters(currentPath),
          description: this.generateApiDescription('/api' + currentPath, ['GET'])
        };
      }
      const content = await import(filePath);
      const methods: string[] = [];
      
      // Check for exported HTTP methods
      const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
      httpMethods.forEach(method => {
        if (content[method]) {
          methods.push(method);
        }
      });

      const apiPath = '/api' + currentPath;
      const parameters = this.extractParameters(currentPath);
      
      return {
        path: apiPath,
        type: 'api',
        methods,
        filePath,
        requiresAuth: await this.checkAuthRequirement(filePath),
        hasParams: parameters.length > 0,
        parameters,
        description: this.generateApiDescription(apiPath, methods)
      };
} catch (error) {
      console.error('Error:', error);
      return null;
    }
  }

  private async processPageRoute(filePath: string, currentPath: string): Promise<RouteInfo | null> {
    try {
      const pagePath = currentPath || '/';
      const parameters = this.extractParameters(currentPath);
      
      return {
        path: pagePath,
        type: 'page',
        methods: ['GET'], // Pages are typically GET requests
        filePath,
        requiresAuth: this.checkPageAuthRequirement(filePath),
        hasParams: parameters.length > 0,
        parameters,
        description: this.generatePageDescription(pagePath)
      };
} catch (error) {
      console.error('Error:', error);
      return null;
    }
  }

  private async processLayoutRoute(filePath: string, currentPath: string): Promise<RouteInfo | null> {
    try {
      const layoutPath = currentPath || '/';
      
      return {
        path: layoutPath,
        type: 'layout',
        methods: ['GET'],
        filePath,
        requiresAuth: this.checkPageAuthRequirement(filePath),
        hasParams: false,
        parameters: [],
        description: `Layout for ${layoutPath}`
      };
} catch (error) {
      console.error('Error:', error);
      return null;
    }
  }

  private extractParameters(path: string): string[] {
    const params: string[] = [];
    const segments = path.split('/');
    
    segments.forEach(segment => {
      if (segment.startsWith('[') && segment.endsWith(']')) {
        params.push(segment.slice(1, -1));
      }
    });
    
    return params;
  }

  private async checkAuthRequirement(filePath: string): Promise<boolean> {
    try {
      // Read file content to check for auth requirements
      const content = await readFile(filePath, 'utf8');
      
      // Look for common auth patterns
      return content.includes('getUserFromRequest') ||
             content.includes('verifyJWTFromRequest') ||
             content.includes('requireAuth') ||
             content.includes('withAuth');
    } catch (error) {
      console.error('Error:', error);
      return false;
    }
  }

  private checkPageAuthRequirement(filePath: string): boolean {
    // Check if page is in an auth-protected directory
    return filePath.includes('/(auth)/') || filePath.includes('/dashboard/');
  }

  private generateApiDescription(path: string, methods: string[]): string {
    const pathSegments = path.split('/').filter(s => s);
    const resource = pathSegments[pathSegments.length - 1];
    
    if (methods.includes('GET') && methods.includes('POST')) {
      return `List and create ${resource}`;
    } else if (methods.includes('GET')) {
      return `Get ${resource}`;
    } else if (methods.includes('POST')) {
      return `Create ${resource}`;
    } else if (methods.includes('PUT') || methods.includes('PATCH')) {
      return `Update ${resource}`;
    } else if (methods.includes('DELETE')) {
      return `Delete ${resource}`;
    }
    
    return `Manage ${resource}`;
  }

  private generatePageDescription(path: string): string {
    if (path === '/') return 'Home page';
    if (path === '/login') return 'Login page';
    if (path === '/dashboard') return 'Main dashboard';
    
    const segments = path.split('/').filter(s => s && !s.startsWith('['));
    const lastSegment = segments[segments.length - 1];
    
    return `${lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1)} page`;
  }

  getRoutesByCategory(): RouteGroup[] {
    const groups: { [key: string]: RouteInfo[] } = {};
    
    this.routes.forEach(route => {
      let category = 'Other';
      
      if (route.path.includes('/auth/')) category = 'Authentication';
      else if (route.path.includes('/customer')) category = 'Customer Management';
      else if (route.path.includes('/lead')) category = 'Lead Management';
      else if (route.path.includes('/sales-case')) category = 'Sales Cases';
      else if (route.path.includes('/quotation')) category = 'Quotations';
      else if (route.path.includes('/sales-order')) category = 'Sales Orders';
      else if (route.path.includes('/invoice')) category = 'Invoices';
      else if (route.path.includes('/inventory')) category = 'Inventory';
      else if (route.path.includes('/accounting')) category = 'Accounting';
      else if (route.path.includes('/system')) category = 'System';
      else if (route.path.includes('/dashboard')) category = 'Dashboard';
      else if (route.type === 'page') category = 'Pages';
      else if (route.type === 'layout') category = 'Layouts';
      
      if (!groups[category]) groups[category] = [];
      groups[category].push(route);
    });
    
    return Object.entries(groups).map(([category, routes]) => ({
      category,
      routes: routes.sort((a, b) => a.path.localeCompare(b.path))
    }));
  }

  getApiRoutes(): RouteInfo[] {
    return this.routes.filter(route => route.type === 'api');
  }

  getPageRoutes(): RouteInfo[] {
    return this.routes.filter(route => route.type === 'page');
  }

  getAuthenticatedRoutes(): RouteInfo[] {
    return this.routes.filter(route => route.requiresAuth);
  }

  getParameterizedRoutes(): RouteInfo[] {
    return this.routes.filter(route => route.hasParams);
  }
}

export const routeDiscovery = new RouteDiscovery();