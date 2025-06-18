#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Puppeteer Quotation Multiline Test${NC}"
echo -e "${GREEN}========================================${NC}\n"

# Check if server is running
echo -e "${YELLOW}Checking if development server is running...${NC}"
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✓ Server is running${NC}\n"
else
    echo -e "${RED}✗ Server is not running!${NC}"
    echo -e "${YELLOW}Please start the server with: npm run dev${NC}\n"
    exit 1
fi

# Create screenshots directory
mkdir -p tests/e2e/screenshots

# Run the test
echo -e "${YELLOW}Select test to run:${NC}"
echo "1) Full test with screenshots (puppeteer-quotation-multiline.test.js)"
echo "2) React-aware test (puppeteer-quotation-react.test.js)"
echo -n "Enter choice [1-2]: "
read choice

case $choice in
    1)
        echo -e "\n${GREEN}Running full Puppeteer test...${NC}\n"
        node tests/e2e/puppeteer-quotation-multiline.test.js
        ;;
    2)
        echo -e "\n${GREEN}Running React-aware test...${NC}\n"
        node tests/e2e/puppeteer-quotation-react.test.js
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac