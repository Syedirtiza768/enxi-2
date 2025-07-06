#!/bin/bash

# Enxi ERP Multi-Instance Backup Script
# This script handles automated backups for all instances

set -e

BASE_DIR="/var/lib/enxi"
BACKUP_BASE_DIR="/var/backups/enxi"
RETENTION_DAYS=30
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_header() {
    echo -e "${BLUE}$1${NC}"
}

# Function to create timestamp
get_timestamp() {
    date +"%Y%m%d_%H%M%S"
}

# Function to get date for retention
get_retention_date() {
    date -d "-${RETENTION_DAYS} days" +"%Y%m%d"
}

# Function to send notification (placeholder for email/slack integration)
send_notification() {
    local subject="$1"
    local message="$2"
    local level="${3:-info}"
    
    # Log to syslog
    logger -t "enxi-backup" "$level: $subject - $message"
    
    # TODO: Add email/slack notification integration
    # Example:
    # curl -X POST -H 'Content-type: application/json' \
    #   --data '{"text":"'"$subject"': '"$message"'"}' \
    #   "$SLACK_WEBHOOK_URL"
}

# Function to backup a single instance
backup_instance() {
    local instance_name=$1
    local instance_dir="$BASE_DIR/instances/$instance_name"
    local backup_timestamp=$(get_timestamp)
    local backup_dir="$BACKUP_BASE_DIR/$instance_name/$backup_timestamp"
    
    if [ ! -d "$instance_dir" ]; then
        print_error "Instance directory not found: $instance_dir"
        return 1
    fi
    
    print_status "Starting backup for instance: $instance_name"
    
    # Create backup directory
    mkdir -p "$backup_dir"
    
    # Set start time
    local start_time=$(date +%s)
    
    # Backup database
    if [ -f "$instance_dir/database/enxi.db" ]; then
        print_status "Backing up database..."
        cp "$instance_dir/database/enxi.db" "$backup_dir/enxi.db"
        
        # Create database dump (if sqlite3 is available)
        if command -v sqlite3 &> /dev/null; then
            sqlite3 "$instance_dir/database/enxi.db" ".dump" > "$backup_dir/database_dump.sql"
            gzip "$backup_dir/database_dump.sql"
        fi
    else
        print_warning "Database file not found for $instance_name"
    fi
    
    # Backup configuration files
    if [ -f "$instance_dir/app/.env.production" ]; then
        print_status "Backing up configuration..."
        cp "$instance_dir/app/.env.production" "$backup_dir/env.production"
    fi
    
    if [ -f "$instance_dir/config/ecosystem.config.js" ]; then
        cp "$instance_dir/config/ecosystem.config.js" "$backup_dir/ecosystem.config.js"
    fi
    
    # Backup logs (last 7 days)
    if [ -d "$instance_dir/logs" ]; then
        print_status "Backing up recent logs..."
        mkdir -p "$backup_dir/logs"
        find "$instance_dir/logs" -name "*.log" -mtime -7 -exec cp {} "$backup_dir/logs/" \;
    fi
    
    # Backup any custom uploads/files if they exist
    if [ -d "$instance_dir/uploads" ]; then
        print_status "Backing up uploads..."
        cp -r "$instance_dir/uploads" "$backup_dir/"
    fi
    
    # Create backup manifest
    cat > "$backup_dir/manifest.json" <<EOF
{
    "instance_name": "$instance_name",
    "backup_timestamp": "$backup_timestamp",
    "backup_date": "$(date -Iseconds)",
    "source_directory": "$instance_dir",
    "backup_directory": "$backup_dir",
    "components": {
        "database": $([ -f "$backup_dir/enxi.db" ] && echo "true" || echo "false"),
        "database_dump": $([ -f "$backup_dir/database_dump.sql.gz" ] && echo "true" || echo "false"),
        "configuration": $([ -f "$backup_dir/env.production" ] && echo "true" || echo "false"),
        "logs": $([ -d "$backup_dir/logs" ] && echo "true" || echo "false"),
        "uploads": $([ -d "$backup_dir/uploads" ] && echo "true" || echo "false")
    }
}
EOF
    
    # Calculate backup size
    local backup_size=$(du -sh "$backup_dir" | cut -f1)
    
    # Compress backup
    print_status "Compressing backup..."
    cd "$BACKUP_BASE_DIR/$instance_name"
    tar -czf "${backup_timestamp}.tar.gz" "$backup_timestamp"
    
    # Verify compressed backup
    if [ -f "${backup_timestamp}.tar.gz" ]; then
        rm -rf "$backup_timestamp"
        local compressed_size=$(du -sh "${backup_timestamp}.tar.gz" | cut -f1)
        print_status "Backup compressed: $compressed_size"
    else
        print_error "Failed to create compressed backup"
        return 1
    fi
    
    # Calculate duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    print_status "Backup completed for $instance_name (${duration}s, $compressed_size)"
    
    # Send success notification
    send_notification "Backup Success" "Instance: $instance_name, Size: $compressed_size, Duration: ${duration}s" "info"
    
    return 0
}

# Function to backup all instances
backup_all_instances() {
    print_header "Starting backup for all instances"
    
    if [ ! -d "$BASE_DIR/instances" ]; then
        print_error "No instances directory found"
        return 1
    fi
    
    local success_count=0
    local failure_count=0
    local total_start_time=$(date +%s)
    
    for instance_dir in "$BASE_DIR/instances"/*; do
        if [ -d "$instance_dir" ]; then
            local instance_name=$(basename "$instance_dir")
            
            if backup_instance "$instance_name"; then
                ((success_count++))
            else
                ((failure_count++))
                send_notification "Backup Failed" "Instance: $instance_name failed to backup" "error"
            fi
        fi
    done
    
    local total_end_time=$(date +%s)
    local total_duration=$((total_end_time - total_start_time))
    
    print_header "Backup summary"
    echo "Successfully backed up: $success_count instances"
    echo "Failed backups: $failure_count instances"
    echo "Total duration: ${total_duration}s"
    
    # Send summary notification
    send_notification "Backup Summary" "Success: $success_count, Failed: $failure_count, Duration: ${total_duration}s" "info"
}

# Function to restore an instance from backup
restore_instance() {
    local instance_name=$1
    local backup_file=$2
    local instance_dir="$BASE_DIR/instances/$instance_name"
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        return 1
    fi
    
    print_warning "This will restore $instance_name from backup and overwrite existing data"
    read -p "Are you sure? (y/N): " confirm
    
    if [[ $confirm != [yY] ]]; then
        print_status "Restore cancelled"
        return 0
    fi
    
    print_status "Starting restore for instance: $instance_name"
    
    # Stop the instance if running
    if pm2 list | grep -q "enxi-$instance_name"; then
        print_status "Stopping instance..."
        pm2 stop "enxi-$instance_name"
    fi
    
    # Create backup of current state
    if [ -d "$instance_dir" ]; then
        print_status "Creating backup of current state..."
        local pre_restore_backup="$BACKUP_BASE_DIR/$instance_name/pre-restore-$(get_timestamp)"
        mkdir -p "$pre_restore_backup"
        cp -r "$instance_dir" "$pre_restore_backup/"
    fi
    
    # Extract backup
    print_status "Extracting backup..."
    local temp_dir=$(mktemp -d)
    cd "$temp_dir"
    tar -xzf "$backup_file"
    
    # Find extracted directory
    local extracted_dir=$(find . -maxdepth 1 -type d -name "20*" | head -n 1)
    if [ -z "$extracted_dir" ]; then
        print_error "Could not find extracted backup directory"
        rm -rf "$temp_dir"
        return 1
    fi
    
    # Restore database
    if [ -f "$extracted_dir/enxi.db" ]; then
        print_status "Restoring database..."
        mkdir -p "$instance_dir/database"
        cp "$extracted_dir/enxi.db" "$instance_dir/database/enxi.db"
    fi
    
    # Restore configuration
    if [ -f "$extracted_dir/env.production" ]; then
        print_status "Restoring configuration..."
        cp "$extracted_dir/env.production" "$instance_dir/app/.env.production"
    fi
    
    if [ -f "$extracted_dir/ecosystem.config.js" ]; then
        mkdir -p "$instance_dir/config"
        cp "$extracted_dir/ecosystem.config.js" "$instance_dir/config/ecosystem.config.js"
    fi
    
    # Restore uploads if they exist
    if [ -d "$extracted_dir/uploads" ]; then
        print_status "Restoring uploads..."
        cp -r "$extracted_dir/uploads" "$instance_dir/"
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
    
    # Start the instance
    print_status "Starting instance..."
    if pm2 list | grep -q "enxi-$instance_name"; then
        pm2 restart "enxi-$instance_name"
    else
        pm2 start "$instance_dir/config/ecosystem.config.js"
    fi
    
    print_status "Restore completed for $instance_name"
    send_notification "Restore Success" "Instance: $instance_name restored successfully" "info"
}

# Function to clean old backups
cleanup_old_backups() {
    local retention_date=$(get_retention_date)
    
    print_status "Cleaning up backups older than $RETENTION_DAYS days..."
    
    if [ ! -d "$BACKUP_BASE_DIR" ]; then
        print_warning "Backup directory not found: $BACKUP_BASE_DIR"
        return 0
    fi
    
    local deleted_count=0
    
    for instance_backup_dir in "$BACKUP_BASE_DIR"/*; do
        if [ -d "$instance_backup_dir" ]; then
            local instance_name=$(basename "$instance_backup_dir")
            
            for backup_file in "$instance_backup_dir"/*.tar.gz; do
                if [ -f "$backup_file" ]; then
                    local backup_filename=$(basename "$backup_file" .tar.gz)
                    local backup_date=$(echo "$backup_filename" | cut -d'_' -f1)
                    
                    if [[ "$backup_date" < "$retention_date" ]]; then
                        print_status "Deleting old backup: $backup_file"
                        rm -f "$backup_file"
                        ((deleted_count++))
                    fi
                fi
            done
        fi
    done
    
    print_status "Cleaned up $deleted_count old backup files"
    
    if [ $deleted_count -gt 0 ]; then
        send_notification "Cleanup Complete" "Deleted $deleted_count old backup files" "info"
    fi
}

# Function to list available backups
list_backups() {
    local instance_name=${1:-}
    
    if [ -n "$instance_name" ]; then
        print_header "Backups for instance: $instance_name"
        local instance_backup_dir="$BACKUP_BASE_DIR/$instance_name"
        
        if [ ! -d "$instance_backup_dir" ]; then
            print_warning "No backups found for instance: $instance_name"
            return 0
        fi
        
        printf "%-20s %-10s %-15s\n" "Backup Date" "Size" "Age"
        printf "%-20s %-10s %-15s\n" "============" "====" "==="
        
        for backup_file in "$instance_backup_dir"/*.tar.gz; do
            if [ -f "$backup_file" ]; then
                local backup_filename=$(basename "$backup_file" .tar.gz)
                local backup_date=$(echo "$backup_filename" | sed 's/_/ /')
                local backup_size=$(du -sh "$backup_file" | cut -f1)
                local backup_age=$(( ($(date +%s) - $(stat -c %Y "$backup_file")) / 86400 ))
                
                printf "%-20s %-10s %-15s\n" "$backup_date" "$backup_size" "${backup_age} days"
            fi
        done
    else
        print_header "All Instance Backups"
        
        if [ ! -d "$BACKUP_BASE_DIR" ]; then
            print_warning "No backup directory found"
            return 0
        fi
        
        for instance_backup_dir in "$BACKUP_BASE_DIR"/*; do
            if [ -d "$instance_backup_dir" ]; then
                local instance_name=$(basename "$instance_backup_dir")
                local backup_count=$(find "$instance_backup_dir" -name "*.tar.gz" | wc -l)
                local total_size=$(du -sh "$instance_backup_dir" 2>/dev/null | cut -f1)
                
                echo "Instance: $instance_name ($backup_count backups, $total_size total)"
            fi
        done
    fi
}

# Function to show help
show_help() {
    echo "Enxi ERP Multi-Instance Backup Management"
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  backup <instance>       Backup a specific instance"
    echo "  backup-all              Backup all instances"
    echo "  restore <instance> <backup_file>  Restore instance from backup"
    echo "  list [instance]         List available backups"
    echo "  cleanup                 Remove old backups (older than $RETENTION_DAYS days)"
    echo "  help                    Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 backup company1"
    echo "  $0 backup-all"
    echo "  $0 restore company1 /var/backups/enxi/company1/20231201_120000.tar.gz"
    echo "  $0 list company1"
    echo "  $0 cleanup"
    echo ""
    echo "Configuration:"
    echo "  BASE_DIR: $BASE_DIR"
    echo "  BACKUP_BASE_DIR: $BACKUP_BASE_DIR"
    echo "  RETENTION_DAYS: $RETENTION_DAYS"
}

# Ensure backup directory exists
mkdir -p "$BACKUP_BASE_DIR"

# Main script logic
case "${1:-}" in
    "backup")
        if [ -z "$2" ]; then
            print_error "Instance name required"
            exit 1
        fi
        backup_instance "$2"
        ;;
    "backup-all")
        backup_all_instances
        ;;
    "restore")
        if [ -z "$2" ] || [ -z "$3" ]; then
            print_error "Usage: $0 restore <instance> <backup_file>"
            exit 1
        fi
        restore_instance "$2" "$3"
        ;;
    "list")
        list_backups "$2"
        ;;
    "cleanup")
        cleanup_old_backups
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        print_error "Unknown command: ${1:-}"
        echo ""
        show_help
        exit 1
        ;;
esac