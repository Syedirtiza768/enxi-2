#!/bin/bash

# Enxi ERP Instance Management Script
# This script provides commands to manage multiple instances

set -e

BASE_DIR="/var/lib/enxi"
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

# Function to list all instances
list_instances() {
    print_header "Enxi ERP Instances"
    echo "==================="
    
    if [ ! -d "$BASE_DIR/instances" ]; then
        print_warning "No instances directory found"
        return
    fi
    
    local count=0
    for instance_dir in "$BASE_DIR/instances"/*; do
        if [ -d "$instance_dir" ]; then
            local instance_name=$(basename "$instance_dir")
            local status="Unknown"
            local port="Unknown"
            local domain="Unknown"
            
            # Get PM2 status
            if pm2 list | grep -q "enxi-$instance_name"; then
                local pm2_status=$(pm2 jlist | jq -r ".[] | select(.name==\"enxi-$instance_name\") | .pm2_env.status")
                status="$pm2_status"
            else
                status="Stopped"
            fi
            
            # Get port from env file
            if [ -f "$instance_dir/app/.env.production" ]; then
                port=$(grep "PORT=" "$instance_dir/app/.env.production" | cut -d'=' -f2)
                domain=$(grep "NEXTAUTH_URL=" "$instance_dir/app/.env.production" | cut -d'=' -f2 | sed 's|https://||')
            fi
            
            printf "%-20s %-10s %-6s %-30s\n" "$instance_name" "$status" "$port" "$domain"
            ((count++))
        fi
    done
    
    if [ $count -eq 0 ]; then
        print_warning "No instances found"
    else
        echo ""
        echo "Total instances: $count"
    fi
}

# Function to start an instance
start_instance() {
    local instance_name=$1
    local instance_dir="$BASE_DIR/instances/$instance_name"
    
    if [ ! -d "$instance_dir" ]; then
        print_error "Instance $instance_name not found"
        return 1
    fi
    
    print_status "Starting instance: $instance_name"
    
    if pm2 list | grep -q "enxi-$instance_name"; then
        pm2 restart "enxi-$instance_name"
    else
        pm2 start "$instance_dir/config/ecosystem.config.js"
        pm2 save
    fi
    
    print_status "Instance started"
}

# Function to stop an instance
stop_instance() {
    local instance_name=$1
    
    print_status "Stopping instance: $instance_name"
    
    if pm2 list | grep -q "enxi-$instance_name"; then
        pm2 stop "enxi-$instance_name"
        print_status "Instance stopped"
    else
        print_warning "Instance not running"
    fi
}

# Function to restart an instance
restart_instance() {
    local instance_name=$1
    
    print_status "Restarting instance: $instance_name"
    
    if pm2 list | grep -q "enxi-$instance_name"; then
        pm2 restart "enxi-$instance_name"
        print_status "Instance restarted"
    else
        print_warning "Instance not running, starting it..."
        start_instance "$instance_name"
    fi
}

# Function to delete an instance
delete_instance() {
    local instance_name=$1
    local instance_dir="$BASE_DIR/instances/$instance_name"
    
    if [ ! -d "$instance_dir" ]; then
        print_error "Instance $instance_name not found"
        return 1
    fi
    
    print_warning "This will permanently delete instance: $instance_name"
    read -p "Are you sure? (y/N): " confirm
    
    if [[ $confirm == [yY] ]]; then
        # Stop PM2 process
        if pm2 list | grep -q "enxi-$instance_name"; then
            pm2 delete "enxi-$instance_name"
            pm2 save
        fi
        
        # Remove nginx config
        if [ -f "/etc/nginx/sites-enabled/enxi-$instance_name" ]; then
            rm -f "/etc/nginx/sites-enabled/enxi-$instance_name"
            rm -f "/etc/nginx/sites-available/enxi-$instance_name"
            systemctl reload nginx
        fi
        
        # Backup data before deletion
        local backup_dir="$BASE_DIR/deleted-instances/$(date +%Y%m%d_%H%M%S)_$instance_name"
        mkdir -p "$backup_dir"
        cp -r "$instance_dir/database" "$backup_dir/"
        cp -r "$instance_dir/config" "$backup_dir/"
        cp "$instance_dir/app/.env.production" "$backup_dir/" 2>/dev/null || true
        
        # Delete instance directory
        rm -rf "$instance_dir"
        
        print_status "Instance deleted (backup saved to: $backup_dir)"
    else
        print_status "Deletion cancelled"
    fi
}

# Function to backup an instance
backup_instance() {
    local instance_name=$1
    local instance_dir="$BASE_DIR/instances/$instance_name"
    
    if [ ! -d "$instance_dir" ]; then
        print_error "Instance $instance_name not found"
        return 1
    fi
    
    print_status "Creating backup for instance: $instance_name"
    
    local backup_dir="$instance_dir/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup database
    if [ -f "$instance_dir/database/enxi.db" ]; then
        cp "$instance_dir/database/enxi.db" "$backup_dir/enxi.db"
    fi
    
    # Backup configuration
    cp -r "$instance_dir/config" "$backup_dir/"
    cp "$instance_dir/app/.env.production" "$backup_dir/" 2>/dev/null || true
    
    # Compress backup
    cd "$instance_dir/backups"
    tar -czf "$(basename $backup_dir).tar.gz" "$(basename $backup_dir)"
    rm -rf "$backup_dir"
    
    print_status "Backup created: $backup_dir.tar.gz"
}

# Function to show logs
show_logs() {
    local instance_name=$1
    local log_type=${2:-"combined"}
    local instance_dir="$BASE_DIR/instances/$instance_name"
    
    if [ ! -d "$instance_dir" ]; then
        print_error "Instance $instance_name not found"
        return 1
    fi
    
    case $log_type in
        "error")
            tail -f "$instance_dir/logs/pm2-error.log"
            ;;
        "out")
            tail -f "$instance_dir/logs/pm2-out.log"
            ;;
        "combined"|*)
            tail -f "$instance_dir/logs/pm2-combined.log"
            ;;
    esac
}

# Function to update an instance
update_instance() {
    local instance_name=$1
    local instance_dir="$BASE_DIR/instances/$instance_name"
    local app_source_dir="$(cd "$SCRIPT_DIR/../.." && pwd)"
    
    if [ ! -d "$instance_dir" ]; then
        print_error "Instance $instance_name not found"
        return 1
    fi
    
    print_status "Updating instance: $instance_name"
    
    # Create backup before update
    backup_instance "$instance_name"
    
    # Stop instance
    stop_instance "$instance_name"
    
    # Update application files
    rsync -av --exclude="node_modules" \
              --exclude=".git" \
              --exclude="prisma/*.db" \
              --exclude=".env*" \
              --exclude="logs" \
              "$app_source_dir/" "$instance_dir/app/"
    
    # Install dependencies and build
    cd "$instance_dir/app"
    npm install --production
    npm run build
    
    # Run database migrations
    npx prisma migrate deploy
    
    # Start instance
    start_instance "$instance_name"
    
    print_status "Instance updated successfully"
}

# Function to show status of an instance
status_instance() {
    local instance_name=$1
    local instance_dir="$BASE_DIR/instances/$instance_name"
    
    if [ ! -d "$instance_dir" ]; then
        print_error "Instance $instance_name not found"
        return 1
    fi
    
    print_header "Instance Status: $instance_name"
    echo "==============================="
    
    # PM2 status
    if pm2 list | grep -q "enxi-$instance_name"; then
        echo "PM2 Status:"
        pm2 show "enxi-$instance_name"
        echo ""
    else
        echo "PM2 Status: Not running"
        echo ""
    fi
    
    # Configuration
    if [ -f "$instance_dir/app/.env.production" ]; then
        echo "Configuration:"
        grep -E "(INSTANCE_NAME|PORT|NEXTAUTH_URL|COMPANY_NAME)" "$instance_dir/app/.env.production" | sed 's/^/  /'
        echo ""
    fi
    
    # Disk usage
    echo "Disk Usage:"
    echo "  $(du -sh "$instance_dir" | cut -f1) total"
    echo "  $(du -sh "$instance_dir/database" 2>/dev/null | cut -f1 || echo "0") database"
    echo "  $(du -sh "$instance_dir/logs" 2>/dev/null | cut -f1 || echo "0") logs"
    echo ""
    
    # Recent logs
    echo "Recent Errors (last 10 lines):"
    if [ -f "$instance_dir/logs/pm2-error.log" ]; then
        tail -n 10 "$instance_dir/logs/pm2-error.log" | sed 's/^/  /'
    else
        echo "  No error logs"
    fi
}

# Function to show help
show_help() {
    echo "Enxi ERP Instance Management"
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  list                    List all instances"
    echo "  start <instance>        Start an instance"
    echo "  stop <instance>         Stop an instance"
    echo "  restart <instance>      Restart an instance"
    echo "  status <instance>       Show instance status"
    echo "  logs <instance> [type]  Show instance logs (error|out|combined)"
    echo "  backup <instance>       Create backup of an instance"
    echo "  update <instance>       Update an instance with latest code"
    echo "  delete <instance>       Delete an instance (with backup)"
    echo "  deploy                  Deploy a new instance"
    echo "  help                    Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 start company1"
    echo "  $0 logs company1 error"
    echo "  $0 deploy"
}

# Main script logic
case "${1:-}" in
    "list")
        list_instances
        ;;
    "start")
        if [ -z "$2" ]; then
            print_error "Instance name required"
            exit 1
        fi
        start_instance "$2"
        ;;
    "stop")
        if [ -z "$2" ]; then
            print_error "Instance name required"
            exit 1
        fi
        stop_instance "$2"
        ;;
    "restart")
        if [ -z "$2" ]; then
            print_error "Instance name required"
            exit 1
        fi
        restart_instance "$2"
        ;;
    "status")
        if [ -z "$2" ]; then
            print_error "Instance name required"
            exit 1
        fi
        status_instance "$2"
        ;;
    "logs")
        if [ -z "$2" ]; then
            print_error "Instance name required"
            exit 1
        fi
        show_logs "$2" "$3"
        ;;
    "backup")
        if [ -z "$2" ]; then
            print_error "Instance name required"
            exit 1
        fi
        backup_instance "$2"
        ;;
    "update")
        if [ -z "$2" ]; then
            print_error "Instance name required"
            exit 1
        fi
        update_instance "$2"
        ;;
    "delete")
        if [ -z "$2" ]; then
            print_error "Instance name required"
            exit 1
        fi
        delete_instance "$2"
        ;;
    "deploy")
        "$SCRIPT_DIR/deploy-instance.sh"
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