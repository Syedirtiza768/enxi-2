#!/bin/bash
# Temporary build script with error suppression
# Created: 2025-06-14T21:01:12.066Z

echo "🚨 Building with TypeScript errors suppressed"
echo "   See suppressed-errors.json for details"
echo ""

# Use the relaxed config for type checking
export TS_NODE_PROJECT="tsconfig.build.json"

# Build Next.js app
npm run build

echo ""
echo "⚠️  Build completed with suppressed errors"
echo "   Critical errors to fix: $(jq '.byPriority.critical' suppressed-errors.json)"
echo "   High priority errors: $(jq '.byPriority.high' suppressed-errors.json)"
