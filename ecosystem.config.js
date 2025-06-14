module.exports = {
  apps: [{
    name: 'enxi-erp',
    script: 'node_modules/.bin/next',
    args: 'dev',
    cwd: '/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      PORT: 3000,
      DATABASE_URL: 'file:/Users/irtizahassan/apps/enxi/enxi-erp/enxi-2/prisma/prisma/dev.db',
      NEXTAUTH_URL: 'http://localhost:3000',
      JWT_SECRET: process.env.JWT_SECRET || 'development-secret-key-change-in-production',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'development-secret-key-change-in-production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    
    // Advanced PM2 features
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    
    // Database connection handling
    kill_timeout: 5000,
    listen_timeout: 3000,
    
    // Error handling
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    merge_logs: true,
    
    // Health check endpoint
    health_check: {
      interval: 30000,
      timeout: 5000,
      max_consecutive_failures: 3
    }
  }]
}