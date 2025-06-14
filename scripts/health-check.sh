#!/bin/bash
# Codebase Health Check Script
# Run daily to monitor codebase health metrics

echo "🏥 Enxi ERP Codebase Health Check"
echo "================================="
echo "Date: $(date)"
echo ""

# Function to count errors/warnings
count_issues() {
    local count=$(echo "$1" | grep -oE '[0-9]+ (error|warning)' | awk '{sum += $1} END {print sum}')
    echo ${count:-0}
}

# 1. Dependencies Check
echo "📦 Dependencies Status:"
echo "----------------------"
AUDIT_OUTPUT=$(npm audit 2>&1)
VULNERABILITIES=$(echo "$AUDIT_OUTPUT" | grep -E "found [0-9]+" | tail -1)
echo "$VULNERABILITIES"
echo ""

# 2. TypeScript Check
echo "🔍 TypeScript Compilation:"
echo "-------------------------"
TSC_OUTPUT=$(npx tsc --noEmit 2>&1)
TSC_ERRORS=$(echo "$TSC_OUTPUT" | grep -c "error TS")
if [ $TSC_ERRORS -eq 0 ]; then
    echo "✅ No TypeScript errors"
else
    echo "❌ Found $TSC_ERRORS TypeScript errors"
    echo "Run 'npx tsc --noEmit' for details"
fi
echo ""

# 3. ESLint Check
echo "🧹 ESLint Analysis:"
echo "------------------"
LINT_OUTPUT=$(npm run lint 2>&1)
LINT_ERRORS=$(echo "$LINT_OUTPUT" | grep -oE '[0-9]+ error' | awk '{sum += $1} END {print sum}')
LINT_WARNINGS=$(echo "$LINT_OUTPUT" | grep -oE '[0-9]+ warning' | awk '{sum += $1} END {print sum}')
echo "Errors: ${LINT_ERRORS:-0}"
echo "Warnings: ${LINT_WARNINGS:-0}"
echo ""

# 4. Test Status
echo "🧪 Test Suite Status:"
echo "--------------------"
# Check if tests can run (don't actually run them in health check)
if [ -f "jest.config.js" ] || [ -f "jest.config.ts" ]; then
    echo "Jest configuration: ✅ Found"
else
    echo "Jest configuration: ❌ Missing"
fi

# Check for test files
TEST_COUNT=$(find . -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx" | grep -v node_modules | wc -l)
echo "Test files found: $TEST_COUNT"
echo ""

# 5. TODO/FIXME Count
echo "📝 TODO/FIXME Comments:"
echo "----------------------"
TODO_COUNT=$(grep -r "TODO" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | wc -l)
FIXME_COUNT=$(grep -r "FIXME" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | wc -l)
echo "TODO: $TODO_COUNT"
echo "FIXME: $FIXME_COUNT"
echo ""

# 6. Code Statistics
echo "📊 Code Statistics:"
echo "------------------"
TS_FILES=$(find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .next | wc -l)
API_ROUTES=$(find app/api -type d -mindepth 1 | grep -v node_modules | wc -l)
SERVICES=$(find lib/services -name "*.ts" | grep -v node_modules | wc -l)
COMPONENTS=$(find components -name "*.tsx" | grep -v node_modules | wc -l)

echo "TypeScript files: $TS_FILES"
echo "API routes: $API_ROUTES"
echo "Service files: $SERVICES"
echo "Components: $COMPONENTS"
echo ""

# 7. Any Type Usage
echo "⚠️  Type Safety Metrics:"
echo "-----------------------"
ANY_COUNT=$(grep -r ": any" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v "// @ts-" | wc -l)
echo "Explicit 'any' types: $ANY_COUNT"
echo ""

# 8. Overall Health Score
echo "🎯 Overall Health Score:"
echo "------------------------"
HEALTH_SCORE=100

# Deduct points for issues
[ $TSC_ERRORS -gt 0 ] && HEALTH_SCORE=$((HEALTH_SCORE - 30))
[ ${LINT_ERRORS:-0} -gt 0 ] && HEALTH_SCORE=$((HEALTH_SCORE - 20))
[ ${LINT_WARNINGS:-0} -gt 10 ] && HEALTH_SCORE=$((HEALTH_SCORE - 10))
[ $ANY_COUNT -gt 50 ] && HEALTH_SCORE=$((HEALTH_SCORE - 15))
[ $TODO_COUNT -gt 20 ] && HEALTH_SCORE=$((HEALTH_SCORE - 5))
[ $FIXME_COUNT -gt 10 ] && HEALTH_SCORE=$((HEALTH_SCORE - 5))

# Ensure score doesn't go below 0
[ $HEALTH_SCORE -lt 0 ] && HEALTH_SCORE=0

# Display health score with emoji
if [ $HEALTH_SCORE -ge 90 ]; then
    echo "Score: $HEALTH_SCORE/100 🟢 Excellent"
elif [ $HEALTH_SCORE -ge 70 ]; then
    echo "Score: $HEALTH_SCORE/100 🟡 Good"
elif [ $HEALTH_SCORE -ge 50 ]; then
    echo "Score: $HEALTH_SCORE/100 🟠 Needs Improvement"
else
    echo "Score: $HEALTH_SCORE/100 🔴 Critical"
fi

echo ""
echo "================================="
echo "Run 'npm run type-check' and 'npm run lint' for detailed reports"

# Save results to file
REPORT_DIR="health-reports"
mkdir -p $REPORT_DIR
REPORT_FILE="$REPORT_DIR/health-check-$(date +%Y%m%d-%H%M%S).txt"

{
    echo "Enxi ERP Health Check Report"
    echo "Date: $(date)"
    echo "TypeScript Errors: $TSC_ERRORS"
    echo "ESLint Errors: ${LINT_ERRORS:-0}"
    echo "ESLint Warnings: ${LINT_WARNINGS:-0}"
    echo "Any Types: $ANY_COUNT"
    echo "TODOs: $TODO_COUNT"
    echo "FIXMEs: $FIXME_COUNT"
    echo "Health Score: $HEALTH_SCORE/100"
} > "$REPORT_FILE"

echo "Report saved to: $REPORT_FILE"