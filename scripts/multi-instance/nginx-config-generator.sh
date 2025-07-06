#!/bin/bash

# Nginx Configuration Generator for Enxi ERP Multi-Instance Setup
# This script generates nginx configurations for multiple deployment strategies

set -e

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

# Function to generate subdomain-based configuration
generate_subdomain_config() {
    local instance_name=$1
    local port=$2
    local domain=$3
    local ssl_enabled=${4:-true}
    local output_file=${5:-"/etc/nginx/sites-available/enxi-$instance_name"}
    
    print_status "Generating subdomain configuration for $instance_name"
    
    if [ "$ssl_enabled" = true ]; then
        cat > "$output_file" <<EOF
# Enxi ERP Instance: $instance_name
# Domain: $domain
# Port: $port

server {
    listen 80;
    server_name $domain;
    
    # Security headers for HTTP requests
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $domain;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$domain/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;
    
    # Client upload limit
    client_max_body_size 10M;
    
    # Proxy configuration
    location / {
        proxy_pass http://localhost:$port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }
    
    # Static file handling with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:$port;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
    }
    
    # API endpoints with stricter rate limiting
    location /api/ {
        limit_req zone=api_limit burst=5 nodelay;
        proxy_pass http://localhost:$port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # API-specific timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://localhost:$port;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    else
        # HTTP-only configuration
        cat > "$output_file" <<EOF
# Enxi ERP Instance: $instance_name (HTTP Only)
# Domain: $domain
# Port: $port

server {
    listen 80;
    server_name $domain;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api_limit_$instance_name:10m rate=10r/s;
    limit_req zone=api_limit_$instance_name burst=20 nodelay;
    
    # Client upload limit
    client_max_body_size 10M;
    
    # Proxy configuration
    location / {
        proxy_pass http://localhost:$port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # API endpoints with stricter rate limiting
    location /api/ {
        limit_req zone=api_limit_$instance_name burst=5 nodelay;
        proxy_pass http://localhost:$port;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    fi
    
    print_status "Configuration saved to: $output_file"
}

# Function to generate path-based configuration
generate_path_config() {
    local instances=("$@")
    local main_domain=$1
    local output_file="/etc/nginx/sites-available/enxi-multipath"
    
    print_status "Generating path-based configuration for multiple instances"
    
    cat > "$output_file" <<EOF
# Enxi ERP Multi-Instance Path-Based Configuration
# Main domain: $main_domain

server {
    listen 80;
    server_name $main_domain;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=global_limit:10m rate=10r/s;
    limit_req zone=global_limit burst=20 nodelay;
    
    # Client upload limit
    client_max_body_size 10M;
    
    # Root location - redirect to instance selection
    location = / {
        return 301 \$scheme://\$host/instances;
    }
    
    # Instance selection page (optional)
    location /instances {
        return 200 'Available Instances: ${instances[*]}';
        add_header Content-Type text/plain;
    }
    
EOF
    
    # Add location blocks for each instance
    shift # Remove main_domain from instances array
    for instance_config in "$@"; do
        local instance_name=$(echo "$instance_config" | cut -d: -f1)
        local port=$(echo "$instance_config" | cut -d: -f2)
        
        cat >> "$output_file" <<EOF
    # Instance: $instance_name
    location /$instance_name/ {
        proxy_pass http://localhost:$port/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Script-Name /$instance_name;
        
        # Rewrite paths for the application
        proxy_redirect ~^/(.*)$ /$instance_name/\$1;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files for $instance_name
    location /$instance_name/_next/ {
        proxy_pass http://localhost:$port/_next/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
EOF
    done
    
    echo "}" >> "$output_file"
    
    print_status "Path-based configuration saved to: $output_file"
}

# Function to generate load balancer configuration
generate_load_balancer_config() {
    local instances=("$@")
    local main_domain=$1
    local output_file="/etc/nginx/sites-available/enxi-load-balancer"
    
    print_status "Generating load balancer configuration"
    
    cat > "$output_file" <<EOF
# Enxi ERP Load Balancer Configuration
# Main domain: $main_domain

upstream enxi_backend {
    least_conn;
    
EOF
    
    # Add upstream servers
    shift # Remove main_domain from instances array
    for instance_config in "$@"; do
        local instance_name=$(echo "$instance_config" | cut -d: -f1)
        local port=$(echo "$instance_config" | cut -d: -f2)
        echo "    server localhost:$port weight=1 max_fails=3 fail_timeout=30s;" >> "$output_file"
    done
    
    cat >> "$output_file" <<EOF
    
    # Health check
    keepalive 32;
}

server {
    listen 80;
    server_name $main_domain;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=lb_limit:10m rate=20r/s;
    limit_req zone=lb_limit burst=50 nodelay;
    
    # Client upload limit
    client_max_body_size 10M;
    
    # Main proxy configuration
    location / {
        proxy_pass http://enxi_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Connection pooling
        proxy_set_header Connection "";
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://enxi_backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    
    print_status "Load balancer configuration saved to: $output_file"
}

# Function to show help
show_help() {
    echo "Nginx Configuration Generator for Enxi ERP"
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  subdomain <instance> <port> <domain> [ssl]"
    echo "      Generate subdomain-based configuration"
    echo "      Example: $0 subdomain company1 3051 company1.example.com true"
    echo ""
    echo "  path <main_domain> <instance1:port1> <instance2:port2> ..."
    echo "      Generate path-based configuration"
    echo "      Example: $0 path example.com company1:3051 company2:3052"
    echo ""
    echo "  loadbalancer <main_domain> <instance1:port1> <instance2:port2> ..."
    echo "      Generate load balancer configuration"
    echo "      Example: $0 loadbalancer example.com instance1:3051 instance2:3052"
    echo ""
    echo "  help"
    echo "      Show this help message"
    echo ""
    echo "After generating configurations:"
    echo "1. Test with: nginx -t"
    echo "2. Enable with: ln -s /etc/nginx/sites-available/config-name /etc/nginx/sites-enabled/"
    echo "3. Reload with: systemctl reload nginx"
    echo "4. For SSL: certbot --nginx -d your-domain.com"
}

# Main script logic
case "${1:-}" in
    "subdomain")
        if [ $# -lt 4 ]; then
            print_error "Usage: $0 subdomain <instance> <port> <domain> [ssl]"
            exit 1
        fi
        generate_subdomain_config "$2" "$3" "$4" "${5:-true}"
        ;;
    "path")
        if [ $# -lt 3 ]; then
            print_error "Usage: $0 path <main_domain> <instance1:port1> <instance2:port2> ..."
            exit 1
        fi
        generate_path_config "$@"
        ;;
    "loadbalancer")
        if [ $# -lt 3 ]; then
            print_error "Usage: $0 loadbalancer <main_domain> <instance1:port1> <instance2:port2> ..."
            exit 1
        fi
        generate_load_balancer_config "$@"
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