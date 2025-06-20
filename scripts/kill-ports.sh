#!/bin/bash

echo "=== Killing processes on ports 3000 and 3001 ==="
echo ""

# Function to kill process on a specific port
kill_port() {
    local port=$1
    echo "Checking port $port..."
    
    # Find process using the port
    local pid=$(lsof -ti :$port)
    
    if [ -z "$pid" ]; then
        echo "✓ No process found on port $port"
    else
        echo "Found process $pid on port $port"
        echo "Killing process..."
        kill -9 $pid
        echo "✓ Process killed on port $port"
    fi
}

# Kill processes on both ports
kill_port 3000
kill_port 3001

echo ""
echo "=== Done ==="

# Show current listening ports
echo ""
echo "Current processes listening on ports:"
lsof -i :3000,3001 | grep LISTEN || echo "No processes found on ports 3000 or 3001"