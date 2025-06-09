module.exports = {
  apps: [{
    name: 'Enxi-AlSahab',
    script: 'npm',
    args: 'start',
    cwd: '/home/ubuntu/enxi-erp',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      DATABASE_URL: 'file:./prisma/dev.db',
      NEXTAUTH_URL: 'http://localhost:3001',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'your-secret-key-here'
    },
    error_file: '/home/ubuntu/.pm2/logs/Enxi-AlSahab-error.log',
    out_file: '/home/ubuntu/.pm2/logs/Enxi-AlSahab-out.log',
    log_file: '/home/ubuntu/.pm2/logs/Enxi-AlSahab-combined.log',
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