#!/bin/bash

# Database Persistence Setup Script for Enxi ERP
# This script configures SQLite database persistence across builds and deployments

set -e

echo "=== Enxi ERP Database Persistence Setup ==="
echo

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PERSISTENT_DB_DIR="${PERSISTENT_DB_DIR:-/var/lib/enxi/database}"
APP_DIR="$(pwd)"
DB_FILE_NAME="enxi.db"

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root (for production setup)
check_permissions() {
    if [ "$EUID" -eq 0 ]; then 
        print_info "Running as root - setting up system-wide persistence"
        SETUP_TYPE="system"
    else
        print_warning "Not running as root - setting up user-local persistence"
        PERSISTENT_DB_DIR="${HOME}/.enxi/database"
        SETUP_TYPE="user"
    fi
}

# Create persistent directory structure
setup_directories() {
    print_info "Creating persistent database directory: $PERSISTENT_DB_DIR"
    
    mkdir -p "$PERSISTENT_DB_DIR"
    
    if [ "$SETUP_TYPE" = "system" ]; then
        # Set proper permissions for system-wide setup
        chmod 755 "$PERSISTENT_DB_DIR"
        
        # Create enxi user if it doesn't exist
        if ! id "enxi" &>/dev/null; then
            print_info "Creating 'enxi' system user"
            useradd -r -s /bin/false enxi || print_warning "Could not create enxi user"
        fi
        
        # Set ownership
        chown -R enxi:enxi "$PERSISTENT_DB_DIR" 2>/dev/null || {
            print_warning "Could not set ownership to enxi user"
        }
    fi
}

# Setup database file
setup_database() {
    local PERSISTENT_DB_PATH="$PERSISTENT_DB_DIR/$DB_FILE_NAME"
    local APP_DB_PATH="$APP_DIR/prisma/prod.db"
    
    # Check if persistent database exists
    if [ -f "$PERSISTENT_DB_PATH" ]; then
        print_info "Found existing persistent database at $PERSISTENT_DB_PATH"
        
        # Create symlink from app to persistent location
        if [ -e "$APP_DB_PATH" ] && [ ! -L "$APP_DB_PATH" ]; then
            print_warning "Found existing database file at $APP_DB_PATH"
            print_info "Backing up existing database to $APP_DB_PATH.backup"
            mv "$APP_DB_PATH" "$APP_DB_PATH.backup"
        fi
        
        print_info "Creating symlink: $APP_DB_PATH -> $PERSISTENT_DB_PATH"
        ln -sf "$PERSISTENT_DB_PATH" "$APP_DB_PATH"
    else
        print_info "No existing persistent database found"
        
        # Check if there's an existing database in the app directory
        if [ -f "$APP_DB_PATH" ]; then
            print_info "Moving existing database to persistent location"
            cp "$APP_DB_PATH" "$PERSISTENT_DB_PATH"
            chmod 666 "$PERSISTENT_DB_PATH"
            
            # Replace with symlink
            rm "$APP_DB_PATH"
            ln -sf "$PERSISTENT_DB_PATH" "$APP_DB_PATH"
        else
            # Check for development database
            if [ -f "$APP_DIR/prisma/prisma/dev.db" ]; then
                print_info "Copying development database to persistent location"
                cp "$APP_DIR/prisma/prisma/dev.db" "$PERSISTENT_DB_PATH"
                chmod 666 "$PERSISTENT_DB_PATH"
                
                # Create symlink
                ln -sf "$PERSISTENT_DB_PATH" "$APP_DB_PATH"
            else
                print_warning "No existing database found - will be created on first run"
                touch "$PERSISTENT_DB_PATH"
                chmod 666 "$PERSISTENT_DB_PATH"
                ln -sf "$PERSISTENT_DB_PATH" "$APP_DB_PATH"
            fi
        fi
    fi
    
    # Set permissions on the persistent database
    chmod 666 "$PERSISTENT_DB_PATH" 2>/dev/null || {
        print_warning "Could not set database permissions"
    }
}

# Update environment configuration
update_env_config() {
    local ENV_FILE="$APP_DIR/.env"
    local ENV_EXAMPLE="$APP_DIR/.env.example"
    local NEW_DB_URL="file:./prisma/prod.db"
    
    print_info "Updating environment configuration"
    
    # Update .env if it exists
    if [ -f "$ENV_FILE" ]; then
        # Backup current .env
        cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Update DATABASE_URL
        if grep -q "DATABASE_URL" "$ENV_FILE"; then
            sed -i.tmp "s|DATABASE_URL=.*|DATABASE_URL=\"$NEW_DB_URL\"|" "$ENV_FILE"
            rm -f "$ENV_FILE.tmp"
            print_info "Updated DATABASE_URL in .env"
        else
            echo "DATABASE_URL=\"$NEW_DB_URL\"" >> "$ENV_FILE"
            print_info "Added DATABASE_URL to .env"
        fi
    fi
    
    # Add persistence note to .env.example
    if [ -f "$ENV_EXAMPLE" ] && ! grep -q "# Database persistence" "$ENV_EXAMPLE"; then
        cat >> "$ENV_EXAMPLE" << 'EOF'

# Database persistence configuration
# For production, the database is stored at /var/lib/enxi/database/enxi.db (system-wide)
# or ~/.enxi/database/enxi.db (user-local) and symlinked to ./prisma/prod.db
# This ensures the database persists across application updates and rebuilds
EOF
        print_info "Added persistence notes to .env.example"
    fi
}

# Create backup script
create_backup_script() {
    local BACKUP_SCRIPT="$APP_DIR/scripts/backup-database.sh"
    
    print_info "Creating database backup script"
    
    cat > "$BACKUP_SCRIPT" << 'EOF'
#!/bin/bash

# Enxi ERP Database Backup Script

set -e

# Configuration
PERSISTENT_DB_DIR="${PERSISTENT_DB_DIR:-/var/lib/enxi/database}"
if [ ! -d "$PERSISTENT_DB_DIR" ]; then
    PERSISTENT_DB_DIR="${HOME}/.enxi/database"
fi

DB_FILE="$PERSISTENT_DB_DIR/enxi.db"
BACKUP_DIR="${BACKUP_DIR:-$PERSISTENT_DB_DIR/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/enxi_${TIMESTAMP}.db"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Perform backup
if [ -f "$DB_FILE" ]; then
    echo "Backing up database to: $BACKUP_FILE"
    cp "$DB_FILE" "$BACKUP_FILE"
    
    # Compress backup
    gzip "$BACKUP_FILE"
    echo "Backup completed: ${BACKUP_FILE}.gz"
    
    # Keep only last 7 days of backups
    find "$BACKUP_DIR" -name "enxi_*.db.gz" -mtime +7 -delete
    echo "Cleaned up old backups (kept last 7 days)"
else
    echo "ERROR: Database file not found at $DB_FILE"
    exit 1
fi
EOF
    
    chmod +x "$BACKUP_SCRIPT"
    print_info "Created backup script at $BACKUP_SCRIPT"
}

# Create systemd service for automatic backups (if running as root)
create_systemd_service() {
    if [ "$SETUP_TYPE" != "system" ]; then
        return
    fi
    
    print_info "Creating systemd timer for automatic backups"
    
    # Create service file
    cat > /etc/systemd/system/enxi-backup.service << EOF
[Unit]
Description=Enxi ERP Database Backup
After=network.target

[Service]
Type=oneshot
ExecStart=$APP_DIR/scripts/backup-database.sh
User=enxi
Group=enxi

[Install]
WantedBy=multi-user.target
EOF
    
    # Create timer file
    cat > /etc/systemd/system/enxi-backup.timer << EOF
[Unit]
Description=Daily Enxi ERP Database Backup
Requires=enxi-backup.service

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
EOF
    
    # Enable timer
    systemctl daemon-reload
    systemctl enable enxi-backup.timer
    systemctl start enxi-backup.timer
    
    print_info "Enabled daily automatic backups via systemd"
}

# Docker volume configuration
create_docker_config() {
    local DOCKER_COMPOSE="$APP_DIR/docker-compose.yml"
    local DOCKER_COMPOSE_EXAMPLE="$APP_DIR/docker-compose.example.yml"
    
    print_info "Creating Docker volume configuration"
    
    cat > "$DOCKER_COMPOSE_EXAMPLE" << 'EOF'
version: '3.8'

services:
  enxi:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:./prisma/prod.db
    volumes:
      # Mount persistent database directory
      - enxi-db:/app/prisma
      # Or use host directory for persistence
      # - /var/lib/enxi/database:/app/prisma
    restart: unless-stopped

volumes:
  enxi-db:
    driver: local
EOF
    
    print_info "Created Docker Compose example at $DOCKER_COMPOSE_EXAMPLE"
}

# Main execution
main() {
    echo "This script will set up persistent database storage for Enxi ERP"
    echo "The database will persist across application rebuilds and updates"
    echo
    
    check_permissions
    setup_directories
    setup_database
    update_env_config
    create_backup_script
    create_systemd_service
    create_docker_config
    
    echo
    print_info "Database persistence setup completed!"
    echo
    echo "Summary:"
    echo "- Database location: $PERSISTENT_DB_DIR/$DB_FILE_NAME"
    echo "- Symlinked to: $APP_DIR/prisma/prod.db"
    echo "- Backup script: $APP_DIR/scripts/backup-database.sh"
    
    if [ "$SETUP_TYPE" = "system" ]; then
        echo "- Automatic daily backups: Enabled via systemd"
    else
        echo "- Run backup script manually or add to cron for automatic backups"
    fi
    
    echo
    echo "Next steps:"
    echo "1. Update your .env file to use: DATABASE_URL=\"file:./prisma/prod.db\""
    echo "2. Run migrations if needed: npm run db:migrate"
    echo "3. Test your application"
    echo "4. Set up regular backups using the provided script"
    echo
    print_info "Done!"
}

# Run main function
main