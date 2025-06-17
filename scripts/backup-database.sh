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
