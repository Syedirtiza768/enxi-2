#!/bin/bash
# Database Security Setup Script
# This script helps configure database access controls and connection limits

set -e

echo "🔒 Database Security Setup"
echo "========================="

# Check if running as root (recommended for system-level changes)
if [[ $EUID -ne 0 ]]; then
   echo "⚠️  This script should be run with sudo for system-level changes"
fi

# Function to setup PostgreSQL security
setup_postgresql_security() {
    echo "📊 Setting up PostgreSQL security..."
    
    # 1. Connection limits in postgresql.conf
    cat << 'EOF'

Add these settings to your postgresql.conf:

# Connection Limits
max_connections = 100              # Adjust based on your needs
superuser_reserved_connections = 3 # Reserve connections for admin

# Statement Timeout (prevent long-running queries)
statement_timeout = 300000         # 5 minutes
idle_in_transaction_session_timeout = 60000  # 1 minute

# Resource Limits
shared_buffers = 256MB            # Adjust based on available RAM
work_mem = 4MB
maintenance_work_mem = 64MB

# Security
ssl = on                          # Enable SSL
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'

# Logging
log_connections = on
log_disconnections = on
log_statement = 'mod'             # Log data-modifying statements
log_min_duration_statement = 1000 # Log queries taking > 1 second

EOF

    # 2. User permissions
    cat << 'EOF'

Database User Permissions Setup:

-- Create application user (run in psql as superuser)
CREATE USER enxi_app WITH PASSWORD 'strong_password_here';
GRANT CONNECT ON DATABASE enxi_production TO enxi_app;
GRANT USAGE ON SCHEMA public TO enxi_app;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO enxi_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO enxi_app;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO enxi_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT USAGE, SELECT ON SEQUENCES TO enxi_app;

-- Create read-only user for reporting
CREATE USER enxi_readonly WITH PASSWORD 'another_strong_password';
GRANT CONNECT ON DATABASE enxi_production TO enxi_readonly;
GRANT USAGE ON SCHEMA public TO enxi_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO enxi_readonly;

-- Revoke dangerous permissions
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE enxi_production FROM PUBLIC;

EOF

    # 3. pg_hba.conf configuration
    cat << 'EOF'

Update pg_hba.conf for connection security:

# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Local connections
local   all             postgres                                peer
local   enxi_production enxi_app                               md5

# Remote connections (adjust IP ranges as needed)
hostssl enxi_production enxi_app        10.0.0.0/24            md5
hostssl enxi_production enxi_readonly   10.0.0.0/24            md5

# Reject all other connections
host    all             all             0.0.0.0/0              reject

EOF
}

# Function to setup MySQL security
setup_mysql_security() {
    echo "🐬 Setting up MySQL security..."
    
    cat << 'EOF'

MySQL Security Setup:

-- Create application user
CREATE USER 'enxi_app'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT SELECT, INSERT, UPDATE, DELETE ON enxi_production.* TO 'enxi_app'@'localhost';

-- Create read-only user
CREATE USER 'enxi_readonly'@'localhost' IDENTIFIED BY 'another_strong_password';
GRANT SELECT ON enxi_production.* TO 'enxi_readonly'@'localhost';

-- Set resource limits
ALTER USER 'enxi_app'@'localhost' 
WITH MAX_QUERIES_PER_HOUR 10000
MAX_UPDATES_PER_HOUR 5000
MAX_CONNECTIONS_PER_HOUR 1000
MAX_USER_CONNECTIONS 20;

-- Remove dangerous privileges
REVOKE ALL PRIVILEGES ON *.* FROM 'enxi_app'@'localhost';
REVOKE CREATE, DROP, ALTER, INDEX ON enxi_production.* FROM 'enxi_app'@'localhost';

FLUSH PRIVILEGES;

EOF

    cat << 'EOF'

Add to my.cnf:

[mysqld]
# Connection limits
max_connections = 200
max_user_connections = 20

# Security
require_secure_transport = ON
default_authentication_plugin = mysql_native_password

# Performance and safety
innodb_buffer_pool_size = 1G  # Adjust based on RAM
innodb_log_file_size = 256M
innodb_flush_method = O_DIRECT

# Slow query log
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2

EOF
}

# Function to create database security monitoring script
create_monitoring_script() {
    cat > /tmp/monitor-database-security.sh << 'EOF'
#!/bin/bash
# Database Security Monitoring Script

# Check for suspicious activity
check_suspicious_queries() {
    echo "🔍 Checking for suspicious queries..."
    
    # PostgreSQL
    if command -v psql &> /dev/null; then
        psql -U postgres -d enxi_production -c "
        SELECT pid, usename, application_name, client_addr, query, state_change
        FROM pg_stat_activity
        WHERE state = 'active'
        AND query NOT LIKE '%pg_stat_activity%'
        ORDER BY state_change;"
    fi
}

# Check connection counts
check_connections() {
    echo "📊 Current database connections:"
    
    # PostgreSQL
    if command -v psql &> /dev/null; then
        psql -U postgres -d enxi_production -c "
        SELECT usename, application_name, count(*)
        FROM pg_stat_activity
        GROUP BY usename, application_name
        ORDER BY count(*) DESC;"
    fi
}

# Check for long-running queries
check_long_queries() {
    echo "⏱️  Long-running queries (>5 minutes):"
    
    # PostgreSQL
    if command -v psql &> /dev/null; then
        psql -U postgres -d enxi_production -c "
        SELECT pid, usename, substring(query, 1, 50) as query_start, 
               now() - query_start as duration
        FROM pg_stat_activity
        WHERE state = 'active'
        AND now() - query_start > interval '5 minutes';"
    fi
}

# Run all checks
echo "Database Security Monitor - $(date)"
echo "================================"
check_connections
echo ""
check_long_queries
echo ""
check_suspicious_queries

EOF
    
    chmod +x /tmp/monitor-database-security.sh
    echo "✅ Monitoring script created at: /tmp/monitor-database-security.sh"
}

# Function to setup automated backups
setup_automated_backups() {
    echo "⏰ Setting up automated backups..."
    
    # Create backup script wrapper
    cat > /tmp/automated-backup.sh << 'EOF'
#!/bin/bash
# Automated backup script

BACKUP_LOG="/var/log/enxi-erp-backup.log"
SCRIPT_PATH="/path/to/your/enxi-erp/scripts/backup-database.ts"

echo "[$(date)] Starting automated backup..." >> $BACKUP_LOG

# Run the backup
cd /path/to/your/enxi-erp
npx tsx $SCRIPT_PATH backup >> $BACKUP_LOG 2>&1

if [ $? -eq 0 ]; then
    echo "[$(date)] Backup completed successfully" >> $BACKUP_LOG
else
    echo "[$(date)] Backup failed!" >> $BACKUP_LOG
    # Send alert email
    echo "Database backup failed at $(date)" | mail -s "URGENT: Enxi ERP Backup Failed" admin@yourcompany.com
fi

# Rotate logs
if [ $(stat -f%z "$BACKUP_LOG" 2>/dev/null || stat -c%s "$BACKUP_LOG") -gt 10485760 ]; then
    mv $BACKUP_LOG $BACKUP_LOG.old
    touch $BACKUP_LOG
fi

EOF

    chmod +x /tmp/automated-backup.sh
    
    # Create crontab entry
    cat << 'EOF'

Add to crontab (crontab -e):

# Daily backup at 2 AM
0 2 * * * /tmp/automated-backup.sh

# Weekly full backup on Sunday at 3 AM
0 3 * * 0 /tmp/automated-backup.sh

# Monthly backup on 1st at 4 AM (kept longer)
0 4 1 * * /tmp/automated-backup.sh

EOF
}

# Main menu
echo ""
echo "Select database type:"
echo "1) PostgreSQL"
echo "2) MySQL"
echo "3) Setup monitoring script only"
echo "4) Setup automated backups"
echo "5) Show all recommendations"

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        setup_postgresql_security
        create_monitoring_script
        setup_automated_backups
        ;;
    2)
        setup_mysql_security
        create_monitoring_script
        setup_automated_backups
        ;;
    3)
        create_monitoring_script
        ;;
    4)
        setup_automated_backups
        ;;
    5)
        setup_postgresql_security
        echo -e "\n-------------------\n"
        setup_mysql_security
        create_monitoring_script
        setup_automated_backups
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✅ Database security setup recommendations complete!"
echo ""
echo "⚠️  Important reminders:"
echo "- Always use strong, unique passwords"
echo "- Regularly review user permissions"
echo "- Monitor database logs for suspicious activity"
echo "- Test your backups regularly"
echo "- Keep your database software updated"
echo "- Use SSL/TLS for all connections"