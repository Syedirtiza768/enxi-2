#!/bin/bash
# Initialize production database

echo "🔧 Initializing Production Database"
echo "==================================="

# 1. Check current database
echo "1. Checking current database..."
if [ -f "prisma/prod.db" ]; then
    echo "Found existing database at prisma/prod.db"
    echo "Size: $(du -h prisma/prod.db | cut -f1)"
else
    echo "No database found, will create new one"
fi

# 2. Backup existing database if it exists
if [ -f "prisma/prod.db" ]; then
    echo ""
    echo "2. Backing up existing database..."
    sudo cp prisma/prod.db "prisma/prod.db.backup.$(date +%Y%m%d_%H%M%S)"
    echo "Backup created"
fi

# 3. Push schema to database
echo ""
echo "3. Applying database schema..."
sudo npm run db:push

# 4. Generate Prisma client
echo ""
echo "4. Generating Prisma client..."
sudo npm run db:generate

# 5. Check database status
echo ""
echo "5. Checking database status..."
sudo npm run check:production-db

# 6. Create initial admin user
echo ""
echo "6. Would you like to create an admin user? (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "Running admin seed..."
    sudo npm run seed:admin
fi

echo ""
echo "✅ Database initialization complete!"
echo ""
echo "Next steps:"
echo "1. Run: sudo npm run seed:production-coa   # Set up Chart of Accounts"
echo "2. Run: sudo npm run seed:production-core  # Set up core system data"
echo "3. Run: ./scripts/restart-production.sh     # Restart the application"