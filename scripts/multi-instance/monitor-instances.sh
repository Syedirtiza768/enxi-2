#!/bin/bash

# Enxi ERP Multi-Instance Monitoring Script
# This script monitors all instances and generates reports

set -e

BASE_DIR="/var/lib/enxi"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

print_success() {
    echo -e "${GREEN}$1${NC}"
}

print_alert() {
    echo -e "${RED}$1${NC}"
}

# Function to get instance status
get_instance_status() {
    local instance_name=$1
    local instance_dir="$BASE_DIR/instances/$instance_name"
    
    # Check if PM2 process is running
    if pm2 list | grep -q "enxi-$instance_name"; then
        local pm2_status=$(pm2 jlist | jq -r ".[] | select(.name==\"enxi-$instance_name\") | .pm2_env.status" 2>/dev/null || echo "unknown")
        echo "$pm2_status"
    else
        echo "stopped"
    fi
}

# Function to get instance port
get_instance_port() {
    local instance_name=$1
    local instance_dir="$BASE_DIR/instances/$instance_name"
    
    if [ -f "$instance_dir/app/.env.production" ]; then
        grep "PORT=" "$instance_dir/app/.env.production" | cut -d'=' -f2
    else
        echo "unknown"
    fi
}

# Function to get instance domain
get_instance_domain() {
    local instance_name=$1
    local instance_dir="$BASE_DIR/instances/$instance_name"
    
    if [ -f "$instance_dir/app/.env.production" ]; then
        grep "NEXTAUTH_URL=" "$instance_dir/app/.env.production" | cut -d'=' -f2 | sed 's|https://||'
    else
        echo "unknown"
    fi
}

# Function to get instance uptime
get_instance_uptime() {
    local instance_name=$1
    
    if pm2 list | grep -q "enxi-$instance_name"; then
        local uptime=$(pm2 jlist | jq -r ".[] | select(.name==\"enxi-$instance_name\") | .pm2_env.pm_uptime" 2>/dev/null || echo "0")
        if [ "$uptime" != "0" ] && [ "$uptime" != "null" ]; then
            local current_time=$(date +%s000)
            local uptime_seconds=$(( (current_time - uptime) / 1000 ))
            
            if [ $uptime_seconds -lt 3600 ]; then
                echo "$((uptime_seconds / 60))m"
            elif [ $uptime_seconds -lt 86400 ]; then
                echo "$((uptime_seconds / 3600))h $((uptime_seconds % 3600 / 60))m"
            else
                echo "$((uptime_seconds / 86400))d $((uptime_seconds % 86400 / 3600))h"
            fi
        else
            echo "0m"
        fi
    else
        echo "stopped"
    fi
}

# Function to get instance memory usage
get_instance_memory() {
    local instance_name=$1
    
    if pm2 list | grep -q "enxi-$instance_name"; then
        local memory=$(pm2 jlist | jq -r ".[] | select(.name==\"enxi-$instance_name\") | .monit.memory" 2>/dev/null || echo "0")
        if [ "$memory" != "0" ] && [ "$memory" != "null" ]; then
            echo "$((memory / 1024 / 1024))MB"
        else
            echo "0MB"
        fi
    else
        echo "0MB"
    fi
}

# Function to get instance CPU usage
get_instance_cpu() {
    local instance_name=$1
    
    if pm2 list | grep -q "enxi-$instance_name"; then
        local cpu=$(pm2 jlist | jq -r ".[] | select(.name==\"enxi-$instance_name\") | .monit.cpu" 2>/dev/null || echo "0")
        if [ "$cpu" != "null" ]; then
            echo "${cpu}%"
        else
            echo "0%"
        fi
    else
        echo "0%"
    fi
}

# Function to check instance health
check_instance_health() {
    local instance_name=$1
    local port=$(get_instance_port "$instance_name")
    local domain=$(get_instance_domain "$instance_name")
    
    # Check if port is listening
    if netstat -tuln | grep -q ":$port "; then
        # Try to make HTTP request to health endpoint
        local health_url="http://localhost:$port/health"
        if curl -s -f -m 5 "$health_url" > /dev/null 2>&1; then
            echo "healthy"
        else
            # Try root endpoint
            if curl -s -f -m 5 "http://localhost:$port/" > /dev/null 2>&1; then
                echo "responding"
            else
                echo "unhealthy"
            fi
        fi
    else
        echo "port_closed"
    fi
}

# Function to get database size
get_database_size() {
    local instance_name=$1
    local instance_dir="$BASE_DIR/instances/$instance_name"
    local db_file="$instance_dir/database/enxi.db"
    
    if [ -f "$db_file" ]; then
        du -sh "$db_file" | cut -f1
    else
        echo "0B"
    fi
}

# Function to get log file sizes
get_log_sizes() {
    local instance_name=$1
    local instance_dir="$BASE_DIR/instances/$instance_name"
    local log_dir="$instance_dir/logs"
    
    if [ -d "$log_dir" ]; then
        du -sh "$log_dir" | cut -f1
    else
        echo "0B"
    fi
}

# Function to check for recent errors
check_recent_errors() {
    local instance_name=$1
    local instance_dir="$BASE_DIR/instances/$instance_name"
    local error_log="$instance_dir/logs/pm2-error.log"
    
    if [ -f "$error_log" ]; then
        # Count errors in last 24 hours
        local error_count=$(grep -c "$(date -d '24 hours ago' '+%Y-%m-%d')" "$error_log" 2>/dev/null || echo "0")
        echo "$error_count"
    else
        echo "0"
    fi
}

# Function to display status dashboard
show_dashboard() {
    clear
    print_header "Enxi ERP Multi-Instance Dashboard"
    print_header "Generated: $(date)"
    echo "================================================================================================="
    
    if [ ! -d "$BASE_DIR/instances" ]; then
        print_warning "No instances directory found"
        return
    fi
    
    # Table header
    printf "${BLUE}%-12s %-10s %-6s %-25s %-10s %-8s %-8s %-12s %-10s %-8s${NC}\n" \
           "Instance" "Status" "Port" "Domain" "Uptime" "Memory" "CPU" "Health" "DB Size" "Errors"
    echo "================================================================================================="
    
    local total_instances=0
    local running_instances=0
    local healthy_instances=0
    
    for instance_dir in "$BASE_DIR/instances"/*; do
        if [ -d "$instance_dir" ]; then
            local instance_name=$(basename "$instance_dir")
            local status=$(get_instance_status "$instance_name")
            local port=$(get_instance_port "$instance_name")
            local domain=$(get_instance_domain "$instance_name")
            local uptime=$(get_instance_uptime "$instance_name")
            local memory=$(get_instance_memory "$instance_name")
            local cpu=$(get_instance_cpu "$instance_name")
            local health=$(check_instance_health "$instance_name")
            local db_size=$(get_database_size "$instance_name")
            local error_count=$(check_recent_errors "$instance_name")
            
            # Truncate domain if too long
            if [ ${#domain} -gt 25 ]; then
                domain="${domain:0:22}..."
            fi
            
            # Color coding based on status
            local color=""
            case "$status" in
                "online")
                    color="$GREEN"
                    ((running_instances++))
                    ;;
                "stopped")
                    color="$RED"
                    ;;
                *)
                    color="$YELLOW"
                    ;;
            esac
            
            # Color coding for health
            local health_color=""
            case "$health" in
                "healthy")
                    health_color="$GREEN"
                    ((healthy_instances++))
                    ;;
                "responding")
                    health_color="$YELLOW"
                    ;;
                *)
                    health_color="$RED"
                    ;;
            esac
            
            # Color coding for errors
            local error_color=""
            if [ "$error_count" -gt 0 ]; then
                error_color="$RED"
            else
                error_color="$GREEN"
            fi
            
            printf "${color}%-12s${NC} %-10s %-6s %-25s %-10s %-8s %-8s ${health_color}%-12s${NC} %-10s ${error_color}%-8s${NC}\n" \
                   "$instance_name" "$status" "$port" "$domain" "$uptime" "$memory" "$cpu" "$health" "$db_size" "$error_count"
            
            ((total_instances++))
        fi
    done
    
    echo "================================================================================================="
    echo "Summary: $total_instances total, $running_instances running, $healthy_instances healthy"
    echo ""
    
    # System resource summary
    print_header "System Resources"
    echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
    echo "Memory: $(free -h | grep '^Mem:' | awk '{print $3 "/" $2}')"
    echo "Disk: $(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 " used)"}')"
    echo "Load: $(uptime | awk -F'load average:' '{print $2}' | xargs)"
    echo ""
    
    # Recent alerts
    print_header "Recent Alerts"
    local alerts_found=false
    
    for instance_dir in "$BASE_DIR/instances"/*; do
        if [ -d "$instance_dir" ]; then
            local instance_name=$(basename "$instance_dir")
            local status=$(get_instance_status "$instance_name")
            local health=$(check_instance_health "$instance_name")
            local error_count=$(check_recent_errors "$instance_name")
            
            if [ "$status" != "online" ]; then
                print_alert "⚠  $instance_name is $status"
                alerts_found=true
            elif [ "$health" != "healthy" ]; then
                print_alert "⚠  $instance_name health check failed ($health)"
                alerts_found=true
            elif [ "$error_count" -gt 5 ]; then
                print_alert "⚠  $instance_name has $error_count errors in the last 24 hours"
                alerts_found=true
            fi
        fi
    done
    
    if [ "$alerts_found" = false ]; then
        print_success "✓ No alerts - all instances are running normally"
    fi
}

# Function to watch dashboard (refresh every 5 seconds)
watch_dashboard() {
    while true; do
        show_dashboard
        sleep 5
    done
}

# Function to generate JSON report
generate_json_report() {
    local output_file="${1:-/tmp/enxi-instances-report.json}"
    
    print_status "Generating JSON report..."
    
    echo "{" > "$output_file"
    echo "  \"timestamp\": \"$(date -Iseconds)\"," >> "$output_file"
    echo "  \"instances\": [" >> "$output_file"
    
    local first=true
    for instance_dir in "$BASE_DIR/instances"/*; do
        if [ -d "$instance_dir" ]; then
            local instance_name=$(basename "$instance_dir")
            
            if [ "$first" = true ]; then
                first=false
            else
                echo "    }," >> "$output_file"
            fi
            
            echo "    {" >> "$output_file"
            echo "      \"name\": \"$instance_name\"," >> "$output_file"
            echo "      \"status\": \"$(get_instance_status "$instance_name")\"," >> "$output_file"
            echo "      \"port\": \"$(get_instance_port "$instance_name")\"," >> "$output_file"
            echo "      \"domain\": \"$(get_instance_domain "$instance_name")\"," >> "$output_file"
            echo "      \"uptime\": \"$(get_instance_uptime "$instance_name")\"," >> "$output_file"
            echo "      \"memory\": \"$(get_instance_memory "$instance_name")\"," >> "$output_file"
            echo "      \"cpu\": \"$(get_instance_cpu "$instance_name")\"," >> "$output_file"
            echo "      \"health\": \"$(check_instance_health "$instance_name")\"," >> "$output_file"
            echo "      \"database_size\": \"$(get_database_size "$instance_name")\"," >> "$output_file"
            echo "      \"log_size\": \"$(get_log_sizes "$instance_name")\"," >> "$output_file"
            echo "      \"recent_errors\": $(check_recent_errors "$instance_name")" >> "$output_file"
        fi
    done
    
    if [ "$first" = false ]; then
        echo "    }" >> "$output_file"
    fi
    
    echo "  ]," >> "$output_file"
    echo "  \"system\": {" >> "$output_file"
    echo "    \"cpu_usage\": \"$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%\"," >> "$output_file"
    echo "    \"memory_usage\": \"$(free -h | grep '^Mem:' | awk '{print $3 "/" $2}')\"," >> "$output_file"
    echo "    \"disk_usage\": \"$(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 " used)"}')\"," >> "$output_file"
    echo "    \"load_average\": \"$(uptime | awk -F'load average:' '{print $2}' | xargs)\"" >> "$output_file"
    echo "  }" >> "$output_file"
    echo "}" >> "$output_file"
    
    print_status "JSON report saved to: $output_file"
}

# Function to check all instances and send alerts
check_alerts() {
    local alerts=()
    
    for instance_dir in "$BASE_DIR/instances"/*; do
        if [ -d "$instance_dir" ]; then
            local instance_name=$(basename "$instance_dir")
            local status=$(get_instance_status "$instance_name")
            local health=$(check_instance_health "$instance_name")
            local error_count=$(check_recent_errors "$instance_name")
            
            if [ "$status" != "online" ]; then
                alerts+=("$instance_name is $status")
            elif [ "$health" != "healthy" ]; then
                alerts+=("$instance_name health check failed ($health)")
            elif [ "$error_count" -gt 10 ]; then
                alerts+=("$instance_name has $error_count errors in the last 24 hours")
            fi
        fi
    done
    
    if [ ${#alerts[@]} -gt 0 ]; then
        print_header "Alerts Found:"
        for alert in "${alerts[@]}"; do
            print_alert "⚠  $alert"
        done
        
        # Send notification (placeholder)
        logger -t "enxi-monitor" "ALERT: ${#alerts[@]} instances have issues"
        
        return 1
    else
        print_success "✓ All instances are healthy"
        return 0
    fi
}

# Function to show help
show_help() {
    echo "Enxi ERP Multi-Instance Monitoring"
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  dashboard               Show instance status dashboard"
    echo "  watch                   Watch dashboard with auto-refresh"
    echo "  json [output_file]      Generate JSON report"
    echo "  alerts                  Check for alerts and issues"
    echo "  help                    Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dashboard"
    echo "  $0 watch"
    echo "  $0 json /tmp/report.json"
    echo "  $0 alerts"
}

# Check if required commands are available
for cmd in pm2 jq curl; do
    if ! command -v "$cmd" &> /dev/null; then
        print_error "Required command '$cmd' not found"
        exit 1
    fi
done

# Main script logic
case "${1:-}" in
    "dashboard")
        show_dashboard
        ;;
    "watch")
        print_status "Starting dashboard watch mode (press Ctrl+C to exit)"
        watch_dashboard
        ;;
    "json")
        generate_json_report "$2"
        ;;
    "alerts")
        check_alerts
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