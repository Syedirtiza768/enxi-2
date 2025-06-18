# Production Fix Instructions

## Immediate Fix Steps

SSH into your production server and run these commands:

```bash
# 1. Navigate to project directory
cd /var/www/html/enxi-2

# 2. Stop the current PM2 process
pm2 stop Enxi-AlSahab

# 3. Clean any old builds
rm -rf .next
rm -rf node_modules/.cache

# 4. Pull latest changes
git pull origin main

# 5. Install ALL dependencies (not just production)
npm install --production=false

# 6. Generate Prisma client
npx prisma generate

# 7. Build the application
NODE_ENV=production npm run build

# 8. Check if .next directory was created
ls -la .next/

# 9. Start PM2 with npm start directly
pm2 delete Enxi-AlSahab
pm2 start npm --name "Enxi-AlSahab" -- start

# 10. Save PM2 config
pm2 save

# 11. Check logs
pm2 logs Enxi-AlSahab --lines 20
```

## If Build Fails

If the build command fails, try:

```bash
# Build with more memory
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Or build in development mode first
NODE_ENV=development npm run build
```

## Alternative: Use Direct Node Command

If PM2 continues to have issues:

```bash
# Kill PM2 process
pm2 delete Enxi-AlSahab

# Start directly with Node
NODE_ENV=production npm start
```

Then in another terminal, check if it's working before setting up PM2 again.

## Verify the Build

After building, ensure these files exist:
```bash
ls -la .next/
ls -la .next/server/
ls -la .next/static/
```

The `prerender-manifest.json` should be in the `.next/` directory after a successful build.