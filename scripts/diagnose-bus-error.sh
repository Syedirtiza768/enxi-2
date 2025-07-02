#!/bin/bash
# Diagnose bus error issues

echo "🔍 Diagnosing Bus Error Issues"
echo "=============================="
echo ""

# 1. Check Node.js version
echo "1. Node.js version:"
node --version
echo ""

# 2. Check system architecture
echo "2. System architecture:"
uname -m
echo ""

# 3. Check memory
echo "3. Memory status:"
free -h
echo ""

# 4. Check disk space
echo "4. Disk space:"
df -h /var/www/html
echo ""

# 5. Check for core dumps
echo "5. Core dumps:"
ls -la /var/crash/ 2>/dev/null || echo "No crash directory found"
ls -la core* 2>/dev/null || echo "No core dumps in current directory"
echo ""

# 6. Check dmesg for errors
echo "6. Recent system errors (last 20 lines):"
sudo dmesg | tail -20
echo ""

# 7. Check Node.js memory limits
echo "7. Node.js memory configuration:"
node -e "console.log('Max heap size:', require('v8').getHeapStatistics().heap_size_limit / 1024 / 1024, 'MB')"
echo ""

# 8. Check for corrupted files in .next
echo "8. Checking .next directory:"
if [ -d ".next" ]; then
    find .next -type f -name "*.js" -exec file {} \; | grep -v "JavaScript" | head -10
else
    echo ".next directory not found"
fi
echo ""

# 9. Test simple Node.js execution
echo "9. Testing Node.js execution:"
node -e "console.log('Node.js is working')"
echo ""

# 10. Check PM2 status
echo "10. PM2 status:"
sudo pm2 status
echo ""

echo "Diagnosis complete. Common solutions:"
echo "- If memory is low: Increase swap or upgrade server"
echo "- If disk is full: Clear logs and temporary files"
echo "- If Node version mismatch: Rebuild with correct version"
echo "- If .next is corrupted: Delete and rebuild"