#!/bin/bash

echo "🚀 Starting E2E Test Runner..."

# Kill any existing dev servers
echo "🔄 Cleaning up existing processes..."
pkill -f "next dev" 2>/dev/null || true
sleep 2

# Export test environment variables
echo "📋 Setting up test environment..."
export DATABASE_URL="file:./prisma/e2e-test.db"
export JWT_SECRET="test-secret-key-for-e2e-tests"
export NODE_ENV="test"

# Start dev server in background with test database
echo "🌐 Starting dev server with test database..."
npm run dev &
DEV_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
sleep 10

# Check if server is responding
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:3000 > /dev/null; then
        echo "✅ Server is ready!"
        break
    fi
    echo "⏳ Waiting for server... (attempt $((attempt + 1))/$max_attempts)"
    sleep 2
    attempt=$((attempt + 1))
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Server failed to start!"
    kill $DEV_PID 2>/dev/null || true
    exit 1
fi

# Run E2E tests
echo "🧪 Running E2E tests..."
npm run test:e2e -- "$@"
TEST_EXIT_CODE=$?

# Cleanup
echo "🧹 Cleaning up..."
kill $DEV_PID 2>/dev/null || true

echo "✅ E2E tests completed with exit code: $TEST_EXIT_CODE"
exit $TEST_EXIT_CODE