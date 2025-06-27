#!/bin/bash

# UAE Marine Comprehensive Seed Script
# This script runs a comprehensive seed that combines all features from the individual parts

echo "🌊 UAE Marine Engine Maintenance Company - Comprehensive Seed"
echo "============================================================="
echo ""

# Check if we should clear existing data
if [ "$1" == "--clear" ]; then
    export CLEAR_DATA=true
    echo "⚠️  WARNING: This will clear all existing data!"
    echo -n "Are you sure you want to continue? (y/N): "
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
else
    export CLEAR_DATA=false
fi

# Set environment variables for comprehensive features
export ENABLE_MULTI_LOCATION=true
export ENABLE_STOCK_LOTS=true
export ENABLE_CUSTOMER_PO=true
export ENABLE_SERVICE_DELIVERY=true
export ENABLE_TERRITORIES=true
export GENERATE_MONTHS=24

echo ""
echo "📋 Configuration:"
echo "  - Clear existing data: $CLEAR_DATA"
echo "  - Multi-location: $ENABLE_MULTI_LOCATION"
echo "  - Stock lot tracking: $ENABLE_STOCK_LOTS"
echo "  - Customer PO tracking: $ENABLE_CUSTOMER_PO"
echo "  - Service delivery: $ENABLE_SERVICE_DELIVERY"
echo "  - Sales territories: $ENABLE_TERRITORIES"
echo "  - Historical data: $GENERATE_MONTHS months"
echo ""

# Run the comprehensive seed
echo "🚀 Starting comprehensive seed..."
echo ""

npx tsx prisma/seed-uae-marine-comprehensive-enhanced.ts

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Seed failed! Check the error messages above."
    exit 1
fi

echo ""
echo "✅ UAE Marine comprehensive seed completed successfully!"
echo ""
echo "📊 Quick Start Guide:"
echo "  - Admin login: admin@uaemarine.ae / password123"
echo "  - Sales Manager: sales.manager@uaemarine.ae / password123"
echo "  - Main warehouse: MAIN-WH (Jebel Ali)"
echo "  - Mobile units: SVC-VAN-01, SVC-VAN-02"
echo ""
echo "🔍 Explore the data:"
echo "  - ${GENERATE_MONTHS} months of historical transactions"
echo "  - Multi-location inventory with stock lots"
echo "  - Complete P2P and O2C workflows"
echo "  - Territory-based sales team"
echo "  - Service delivery tracking"
echo ""