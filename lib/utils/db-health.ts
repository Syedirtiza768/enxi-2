import { prisma } from '@/lib/db/prisma'

export interface DatabaseHealth {
  isConnected: boolean
  latency: number
  error?: string
  lastChecked: Date
}

class DatabaseHealthMonitor {
  private healthStatus: DatabaseHealth = {
    isConnected: false,
    latency: -1,
    lastChecked: new Date()
  }

  private checkInterval: NodeJS.Timer | null = null
  private readonly CHECK_INTERVAL = 30000 // 30 seconds

  async checkHealth(): Promise<DatabaseHealth> {
    const startTime = Date.now()
    
    try {
      // Simple query to check database connectivity
      await prisma.$queryRaw`SELECT 1`
      
      const latency = Date.now() - startTime
      
      this.healthStatus = {
        isConnected: true,
        latency,
        lastChecked: new Date()
      }
      
      return this.healthStatus
    } catch (error) {
      console.error('Database health check failed:', error)
      
      this.healthStatus = {
        isConnected: false,
        latency: -1,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date()
      }
      
      return this.healthStatus
    }
  }

  startMonitoring(): void {
    if (this.checkInterval) {
      return // Already monitoring
    }

    // Initial check
    this.checkHealth()

    // Set up periodic checks
    this.checkInterval = setInterval(() => {
      this.checkHealth()
    }, this.CHECK_INTERVAL)
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  getStatus(): DatabaseHealth {
    return { ...this.healthStatus }
  }

  isHealthy(): boolean {
    const timeSinceLastCheck = Date.now() - this.healthStatus.lastChecked.getTime()
    
    // Consider unhealthy if not checked in last minute or not connected
    if (timeSinceLastCheck > 60000 || !this.healthStatus.isConnected) {
      return false
    }
    
    // Consider unhealthy if latency is too high
    return this.healthStatus.latency < 1000 // 1 second threshold
  }
}

export const dbHealthMonitor = new DatabaseHealthMonitor()

// Middleware to check database health before processing requests
export async function ensureDatabaseConnection(): Promise<void> {
  if (!dbHealthMonitor.isHealthy()) {
    const health = await dbHealthMonitor.checkHealth()
    
    if (!health.isConnected) {
      throw new Error(`Database connection unavailable: ${health.error || 'Unknown error'}`)
    }
  }
}

// Auto-start monitoring in production
if (process.env.NODE_ENV === 'production') {
  dbHealthMonitor.startMonitoring()
}