import { PrismaClient } from '@prisma/client';

export interface DatabaseHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  connectionCount: number;
  error?: string;
  timestamp: string;
}

export interface ServiceHealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details?: Record<string, unknown>;
  error?: string;
  timestamp: string;
}

export interface SystemMetrics {
  memory: NodeJS.MemoryUsage;
  cpu: NodeJS.CpuUsage;
  uptime: number;
  loadAverage: number[];
  freeMemory: number;
  totalMemory: number;
  timestamp: string;
}

class SystemHealthService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async checkDatabaseHealth(): Promise<DatabaseHealthCheck> {
    const startTime = Date.now();
    
    try {
      // Test basic connection
      await this.prisma.$connect();
      
      // Test query execution
      await this.prisma.$queryRaw`SELECT 1 as test`;
      
      // Get connection info (if available)
      let connectionCount = 0;
      try {
        // This is a PostgreSQL specific query - adjust for your database
        const result = await this.prisma.$queryRaw`
          SELECT count(*) as connections 
          FROM pg_stat_activity 
          WHERE state = 'active'
        ` as Record<string, unknown>[];
        
        connectionCount = parseInt((result[0] as Record<string, unknown>)?.connections as string || '0');
      } catch (error) {
      console.error('Error:', error);
      // If we can't get connection count, that's okay
    }

      const responseTime = Date.now() - startTime;
      await this.prisma.$disconnect();

      const status = responseTime > 5000 ? 'degraded' : 
                     responseTime > 10000 ? 'unhealthy' : 'healthy';

      return {
        status,
        responseTime,
        connectionCount,
        timestamp: new Date().toISOString()
      };
    } catch {
      // Ignore disconnect errors when already failed
      return {
        status: 'unhealthy',
        responseTime,
        connectionCount: 0,
        error: errorMessage,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkExternalServices(): Promise<ServiceHealthCheck[]> {
    const services: ServiceHealthCheck[] = [];

    // Check email service (if configured)
    if (process.env.SMTP_HOST) {
      services.push(await this.checkEmailService());
    }

    // Check file storage service (if configured)
    if (process.env.AWS_S3_BUCKET || process.env.CLOUDINARY_URL) {
      services.push(await this.checkStorageService());
    }

    // Check external API dependencies
    services.push(await this.checkCurrencyAPI());

    return services;
  }

  private async checkEmailService(): Promise<ServiceHealthCheck> {
    const startTime = Date.now();
    
    try {
      // Basic SMTP connection test (simplified)
      // In a real implementation, you'd use nodemailer or similar
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'email',
        status: 'healthy',
        responseTime,
        timestamp: new Date().toISOString()
      };
      
} catch (error) {
      console.error('Error:', error);
    }
  }

  private async checkStorageService(): Promise<ServiceHealthCheck> {
    const startTime = Date.now();
    
    try {
      // Test storage service connectivity
      // This is a placeholder - implement actual storage health check
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'storage',
        status: 'healthy',
        responseTime,
        timestamp: new Date().toISOString()
      };
      
} catch (error) {
      console.error('Error:', error);
    }
  }

  private async checkCurrencyAPI(): Promise<ServiceHealthCheck> {
    const startTime = Date.now();
    
    try {
      // Test external currency API
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
        method: 'GET',
        headers: { 'User-Agent': 'SystemHealthMonitor/1.0' },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        return {
          service: 'currency_api',
          status: 'degraded',
          responseTime,
          error: `HTTP ${response.status}`,
          timestamp: new Date().toISOString()
        };
      }

      const status = responseTime > 3000 ? 'degraded' : 'healthy';
      
      return {
        service: 'currency_api',
        status,
        responseTime,
        timestamp: new Date().toISOString()
      };
      
} catch (error) {
      console.error('Error:', error);
    }
  }

  getSystemMetrics(): SystemMetrics {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Get system memory info (Node.js specific)
    const os = await import('os');
    const freeMemory = os.freemem();
    const totalMemory = os.totalmem();
    const loadAverage = os.loadavg();

    return {
      memory: memoryUsage,
      cpu: cpuUsage,
      uptime: process.uptime(),
      loadAverage,
      freeMemory,
      totalMemory,
      timestamp: new Date().toISOString()
    };
  }

  async performComprehensiveHealthCheck(): Promise<{
    database: DatabaseHealthCheck;
    services: ServiceHealthCheck[];
    metrics: SystemMetrics;
    overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  }> {
    const startTime = Date.now();

    try {
      // Run all health checks in parallel
      const [databaseHealth, servicesHealth] = await Promise.all([
        this.checkDatabaseHealth(),
        this.checkExternalServices()
      ]);

      const systemMetrics = this.getSystemMetrics();

      // Determine overall status
      let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (databaseHealth.status === 'unhealthy') {
        overallStatus = 'unhealthy';
      } else if (
        databaseHealth.status === 'degraded' ||
        servicesHealth.some(s => s.status === 'unhealthy') ||
        systemMetrics.memory.heapUsed / systemMetrics.memory.heapTotal > 0.9 // 90% memory usage
      ) {
        overallStatus = 'degraded';
      } else if (
        servicesHealth.some(s => s.status === 'degraded') ||
        systemMetrics.memory.heapUsed / systemMetrics.memory.heapTotal > 0.7 // 70% memory usage
      ) {
        overallStatus = 'degraded';
      }

      const _totalTime = Date.now() - startTime;
      
      return {
        database: databaseHealth,
        services: servicesHealth,
        metrics: systemMetrics,
        overallStatus
      };
    } catch (error) {
      console.error('Error:', error);
      return {
        database: await this.checkDatabase(),
        services: [],
        metrics: this.getSystemMetrics(),
        overallStatus: 'unhealthy'
      };
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.prisma.$disconnect();
    } catch (error) {
      console.error('Error:', error);
    }
  }
}

export const systemHealthService = new SystemHealthService();