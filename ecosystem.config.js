module.exports = {
  apps: [{
    name: 'enxi-erp',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: './',
    env: {
      PORT: 3000,
      NODE_ENV: 'production',
      DATABASE_URL: 'file:./prisma/prod.db',
      JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-here',
      NEXTAUTH_URL: 'https://erp.alsahab.me',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'your-nextauth-secret-here'
    },
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    min_uptime: '10s',
    max_restarts: 10
  }]
}