#!/bin/bash

echo "🚀 E2E Test Runner"
echo "=================="

# Kill any existing servers
echo "🔄 Cleaning up existing processes..."
pkill -f "next dev" 2>/dev/null || true
sleep 2

# Save current env file
echo "📋 Backing up current .env file..."
cp .env .env.original 2>/dev/null || true

# Create test env
echo "📝 Setting up test environment..."
cat > .env << EOF
# Test Database
DATABASE_URL="file:./prisma/e2e-test.db"

# JWT Secret (test key)
JWT_SECRET="test-secret-key-for-e2e-tests"

# Next.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="test-nextauth-secret"

# Additional required env vars
NODE_ENV="test"
SKIP_ENV_VALIDATION="true"
EOF

# Start dev server
echo "🌐 Starting dev server with test database..."
npm run dev > /tmp/e2e-dev.log 2>&1 &
DEV_PID=$!

# Wait for server
echo "⏳ Waiting for server to be ready..."
max_attempts=30
attempt=0
SERVER_URL=""
while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ Server is ready on port 3000!"
        SERVER_URL="http://localhost:3000"
        break
    elif curl -s http://localhost:3001 > /dev/null 2>&1; then
        echo "✅ Server is ready on port 3001!"
        SERVER_URL="http://localhost:3001"
        break
    fi
    echo "⏳ Waiting... (attempt $((attempt + 1))/$max_attempts)"
    sleep 2
    attempt=$((attempt + 1))
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Server failed to start!"
    cat /tmp/e2e-dev.log
    # Restore env
    mv .env.original .env 2>/dev/null || true
    kill $DEV_PID 2>/dev/null || true
    exit 1
fi

# Export the base URL for E2E tests
export E2E_BASE_URL="${SERVER_URL}"

# Run tests
echo "🧪 Running E2E tests with base URL: ${E2E_BASE_URL}..."
npm run test:e2e -- "$@"
TEST_EXIT_CODE=$?

# Cleanup
echo "🧹 Cleaning up..."
kill $DEV_PID 2>/dev/null || true

# Restore original env
echo "📋 Restoring original .env file..."
mv .env.original .env 2>/dev/null || true

echo "✅ Tests completed with exit code: $TEST_EXIT_CODE"
exit $TEST_EXIT_CODE