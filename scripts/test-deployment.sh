#!/bin/bash

# Deployment Testing Script
# Tests deployed application endpoints and functionality

set -e

# Configuration
BASE_URL=${BASE_URL:-"http://localhost:3000"}
TIMEOUT=${TIMEOUT:-30}

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    print_header "Running: $test_name"
    
    if eval "$test_command"; then
        print_success "$test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        print_error "$test_name"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Test basic connectivity
test_connectivity() {
    curl -f -s --max-time $TIMEOUT "$BASE_URL/" > /dev/null
}

# Test health endpoints
test_health_endpoints() {
    curl -f -s --max-time $TIMEOUT "$BASE_URL/health/live" > /dev/null &&
    curl -f -s --max-time $TIMEOUT "$BASE_URL/health/ready" > /dev/null &&
    curl -f -s --max-time $TIMEOUT "$BASE_URL/health" > /dev/null
}

# Test API endpoints structure
test_api_structure() {
    local response=$(curl -f -s --max-time $TIMEOUT "$BASE_URL/")
    echo "$response" | grep -q "Lead Scoring Backend API" &&
    echo "$response" | grep -q "endpoints"
}

# Test offer endpoint
test_offer_endpoint() {
    local offer_data='{
        "name": "Test Offer",
        "value_props": ["Test value prop"],
        "ideal_use_cases": ["Test use case"]
    }'
    
    curl -f -s --max-time $TIMEOUT \
        -H "Content-Type: application/json" \
        -d "$offer_data" \
        "$BASE_URL/offer" > /dev/null
}

# Test error handling
test_error_handling() {
    # Test 404
    local response=$(curl -s -w "%{http_code}" "$BASE_URL/nonexistent" -o /dev/null)
    [ "$response" = "404" ] &&
    
    # Test invalid JSON
    local response=$(curl -s -w "%{http_code}" \
        -H "Content-Type: application/json" \
        -d "invalid json" \
        "$BASE_URL/offer" -o /dev/null)
    [ "$response" = "400" ]
}

# Test CORS headers
test_cors() {
    local response=$(curl -s -I --max-time $TIMEOUT "$BASE_URL/health/live")
    echo "$response" | grep -i "access-control-allow-origin" > /dev/null
}

# Test response times
test_performance() {
    local start_time=$(date +%s%N)
    curl -f -s --max-time $TIMEOUT "$BASE_URL/health/live" > /dev/null
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    
    [ $duration -lt 5000 ] # Should respond within 5 seconds
}

# Test comprehensive workflow (if possible)
test_workflow() {
    # This is a simplified workflow test
    # In a real scenario, you might want to test the complete flow
    
    # 1. Submit offer
    local offer_data='{
        "name": "Deployment Test Offer",
        "value_props": ["Automated testing", "Reliable deployment"],
        "ideal_use_cases": ["Production environments", "CI/CD pipelines"]
    }'
    
    curl -f -s --max-time $TIMEOUT \
        -H "Content-Type: application/json" \
        -d "$offer_data" \
        "$BASE_URL/offer" > /dev/null &&
    
    # 2. Check offer was stored
    curl -f -s --max-time $TIMEOUT "$BASE_URL/offer" | grep -q "Deployment Test Offer"
}

# Main testing function
main() {
    print_header "Lead Scoring Backend API - Deployment Testing"
    print_header "============================================="
    print_header "Testing URL: $BASE_URL"
    print_header ""
    
    # Run all tests
    run_test "Basic Connectivity" "test_connectivity"
    run_test "Health Endpoints" "test_health_endpoints"
    run_test "API Structure" "test_api_structure"
    run_test "Offer Endpoint" "test_offer_endpoint"
    run_test "Error Handling" "test_error_handling"
    run_test "CORS Headers" "test_cors"
    run_test "Performance" "test_performance"
    run_test "Basic Workflow" "test_workflow"
    
    # Print summary
    print_header ""
    print_header "Test Summary"
    print_header "============"
    echo "Tests Run: $TESTS_RUN"
    echo "Passed: $TESTS_PASSED"
    echo "Failed: $TESTS_FAILED"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        print_success "🎉 All deployment tests passed!"
        exit 0
    else
        print_error "❌ Some deployment tests failed!"
        exit 1
    fi
}

# Handle command line arguments
if [ $# -eq 0 ]; then
    main
else
    case "$1" in
        "connectivity")
            run_test "Basic Connectivity" "test_connectivity"
            ;;
        "health")
            run_test "Health Endpoints" "test_health_endpoints"
            ;;
        "api")
            run_test "API Structure" "test_api_structure"
            ;;
        "offer")
            run_test "Offer Endpoint" "test_offer_endpoint"
            ;;
        "errors")
            run_test "Error Handling" "test_error_handling"
            ;;
        "cors")
            run_test "CORS Headers" "test_cors"
            ;;
        "performance")
            run_test "Performance" "test_performance"
            ;;
        "workflow")
            run_test "Basic Workflow" "test_workflow"
            ;;
        *)
            echo "Usage: $0 [connectivity|health|api|offer|errors|cors|performance|workflow]"
            exit 1
            ;;
    esac
fi