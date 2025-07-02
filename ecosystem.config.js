module.exports = {
  apps: [{
    name: 'Enxi-AlSahab',
    script: 'npm',
    args: 'start',
    cwd: './',
    env: {
      PORT: 3050,
      NODE_ENV: 'production',
      DATABASE_URL: 'file:./prisma/prod.db',
      JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-here',
      NEXTAUTH_URL: 'https://erp.alsahab.me',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'your-nextauth-secret-here',
      NODE_OPTIONS: '--max-old-space-size=1024'
    },
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '768M',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    min_uptime: '10s',
    max_restarts: 10,
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    // Handle SIGINT/SIGTERM
    shutdown_with_message: true,
    // Interpreter args for better stability
    interpreter_args: '--max-old-space-size=1024'
  }]
}