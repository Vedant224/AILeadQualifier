#!/bin/bash

# Health Check Script for Lead Scoring Backend API
# Used for monitoring and deployment validation

set -e

# Configuration
HOST=${HOST:-localhost}
PORT=${PORT:-3000}
TIMEOUT=${TIMEOUT:-30}

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[HEALTH]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check if service is responding
check_liveness() {
    print_status "Checking service liveness..."
    
    if curl -f -s --max-time $TIMEOUT "http://${HOST}:${PORT}/health/live" > /dev/null; then
        print_status "✓ Service is alive"
        return 0
    else
        print_error "✗ Service is not responding"
        return 1
    fi
}

# Check if service is ready
check_readiness() {
    print_status "Checking service readiness..."
    
    response=$(curl -f -s --max-time $TIMEOUT "http://${HOST}:${PORT}/health/ready" || echo "failed")
    
    if [[ $response == *"ready"* ]]; then
        print_status "✓ Service is ready"
        return 0
    else
        print_error "✗ Service is not ready"
        return 1
    fi
}

# Check comprehensive health
check_health() {
    print_status "Checking comprehensive health..."
    
    response=$(curl -f -s --max-time $TIMEOUT "http://${HOST}:${PORT}/health" || echo "failed")
    
    if [[ $response == *"healthy"* ]]; then
        print_status "✓ Service is healthy"
        return 0
    elif [[ $response == *"degraded"* ]]; then
        print_warning "⚠ Service is degraded but functional"
        return 0
    else
        print_error "✗ Service is unhealthy"
        return 1
    fi
}

# Test API endpoints
test_endpoints() {
    print_status "Testing API endpoints..."
    
    # Test root endpoint
    if curl -f -s --max-time $TIMEOUT "http://${HOST}:${PORT}/" > /dev/null; then
        print_status "✓ Root endpoint responding"
    else
        print_error "✗ Root endpoint not responding"
        return 1
    fi
    
    # Test health metrics
    if curl -f -s --max-time $TIMEOUT "http://${HOST}:${PORT}/health/metrics" > /dev/null; then
        print_status "✓ Metrics endpoint responding"
    else
        print_warning "⚠ Metrics endpoint not responding"
    fi
    
    return 0
}

# Get service metrics
get_metrics() {
    print_status "Retrieving service metrics..."
    
    metrics=$(curl -f -s --max-time $TIMEOUT "http://${HOST}:${PORT}/health/metrics" 2>/dev/null || echo "{}")
    
    if [[ $metrics != "{}" ]]; then
        echo "$metrics" | jq -r '
            "Memory Usage: " + (.data.memory.heap_usage_percentage | tostring) + "%",
            "Uptime: " + (.data.system.uptime_seconds | tostring) + "s",
            "Leads Stored: " + (.data.storage.lead_count | tostring),
            "Results Available: " + (.data.storage.scored_result_count | tostring)
        ' 2>/dev/null || echo "Metrics retrieved but parsing failed"
    else
        print_warning "Could not retrieve metrics"
    fi
}

# Main health check function
main() {
    print_status "Lead Scoring Backend API - Health Check"
    print_status "======================================"
    print_status "Target: http://${HOST}:${PORT}"
    print_status ""
    
    local exit_code=0
    
    # Run all checks
    check_liveness || exit_code=1
    check_readiness || exit_code=1
    check_health || exit_code=1
    test_endpoints || exit_code=1
    
    print_status ""
    get_metrics
    
    print_status ""
    if [ $exit_code -eq 0 ]; then
        print_status "🎉 All health checks passed!"
    else
        print_error "❌ Some health checks failed!"
    fi
    
    exit $exit_code
}

# Handle command line arguments
case "${1:-all}" in
    "live"|"liveness")
        check_liveness
        ;;
    "ready"|"readiness")
        check_readiness
        ;;
    "health")
        check_health
        ;;
    "endpoints")
        test_endpoints
        ;;
    "metrics")
        get_metrics
        ;;
    "all"|*)
        main
        ;;
esac