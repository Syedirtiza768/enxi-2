# Ubuntu Database Setup Guide

## Fix DATABASE_URL Error

### Option 1: Create .env file (Recommended)

```bash
# Navigate to your project directory
cd /var/www/html/enxi-2

# Create .env file
sudo nano .env
```

Add the following content:
```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
NEXTAUTH_SECRET="your-nextauth-secret-change-this-in-production"
```

Save and exit (Ctrl+X, Y, Enter)

### Option 2: Set environment variable temporarily

```bash
# Set DATABASE_URL for current session
export DATABASE_URL="file:./prisma/dev.db"

# Then run prisma commands
sudo npx prisma db push
```

### Option 3: Set environment variable permanently

```bash
# Edit the environment file
sudo nano /etc/environment
```

Add this line:
```
DATABASE_URL="file:./prisma/dev.db"
```

Then reload:
```bash
source /etc/environment
```

### Option 4: Use inline environment variable

```bash
# Run with inline environment variable
sudo DATABASE_URL="file:./prisma/dev.db" npx prisma db push
```

## Complete Setup Steps

1. **Create .env file**:
```bash
cd /var/www/html/enxi-2
sudo cp .env.example .env 2>/dev/null || sudo touch .env
sudo nano .env
```

2. **Add required environment variables**:
```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NODE_ENV="production"
```

3. **Set proper permissions**:
```bash
sudo chmod 600 .env
sudo chown www-data:www-data .env
```

4. **Initialize database**:
```bash
# Create prisma directory if it doesn't exist
sudo mkdir -p prisma

# Set permissions
sudo chown -R www-data:www-data prisma

# Push schema to database
sudo -u www-data npx prisma db push

# Generate Prisma client
sudo -u www-data npx prisma generate

# Run migrations (if any)
sudo -u www-data npx prisma migrate deploy
```

5. **Seed database** (optional):
```bash
sudo -u www-data npx prisma db seed
```

## Verify Setup

```bash
# Check if .env exists
ls -la .env

# Check database file
ls -la prisma/dev.db

# Test database connection
sudo -u www-data npx prisma db pull
```

## Troubleshooting

If you still get errors:

1. **Check Node.js version**:
```bash
node --version  # Should be 18.x or higher
```

2. **Clear npm cache**:
```bash
sudo npm cache clean --force
```

3. **Reinstall dependencies**:
```bash
sudo rm -rf node_modules package-lock.json
sudo npm install
```

4. **Check file permissions**:
```bash
# Ensure www-data owns the project
sudo chown -R www-data:www-data /var/www/html/enxi-2
```

5. **Use PostgreSQL instead** (for production):
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb enxi_erp

# Update .env
DATABASE_URL="postgresql://postgres:password@localhost:5432/enxi_erp"
```

## Production Recommendations

For production, consider:
1. Using PostgreSQL instead of SQLite
2. Setting secure JWT_SECRET and NEXTAUTH_SECRET
3. Using environment-specific .env files
4. Setting up proper backup procedures
5. Implementing database connection pooling