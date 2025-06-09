#!/bin/bash

echo "Fixing database permissions..."

# Make database files world-writable
chmod 666 prisma/dev.db
chmod 666 prisma/dev.db-shm

# Create WAL file if it doesn't exist and set permissions
touch prisma/dev.db-wal
chmod 666 prisma/dev.db-wal

# Create a symlink for the database in a standard location
sudo mkdir -p /var/lib/enxi-erp
sudo ln -sf /Users/irtizahassan/apps/enxi/enxi-erp/prisma/dev.db /var/lib/enxi-erp/dev.db
sudo chmod 777 /var/lib/enxi-erp

echo "Database permissions fixed!"
echo "Files:"
ls -la prisma/dev.db*