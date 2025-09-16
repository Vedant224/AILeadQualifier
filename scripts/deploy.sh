#!/bin/bash

# Lead Scoring Backend API Deployment Script
# Prepares and deploys the application to production environment

set -e  # Exit on any error

echo "🚀 Starting deployment preparation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required environment variables are set
check_env_vars() {
    print_status "Checking environment variables..."
    
    if [ -z "$GEMINI_API_KEY" ]; then
        print_error "GEMINI_API_KEY environment variable is required"
        exit 1
    fi
    
    if [ -z "$NODE_ENV" ]; then
        export NODE_ENV=production
        print_warning "NODE_ENV not set, defaulting to production"
    fi
    
    print_status "Environment variables check passed ✓"
}

# Install dependencies
install_dependencies() {
    print_status "Installing production dependencies..."
    npm ci --only=production
    print_status "Dependencies installed ✓"
}

# Build the application
build_application() {
    print_status "Building TypeScript application..."
    npm run build
    
    if [ ! -d "dist" ]; then
        print_error "Build failed - dist directory not found"
        exit 1
    fi
    
    print_status "Application built successfully ✓"
}

# Run tests
run_tests() {
    print_status "Running test suite..."
    npm test
    print_status "All tests passed ✓"
}

# Validate deployment
validate_deployment() {
    print_status "Validating deployment configuration..."
    
    # Check if all required files exist
    required_files=("dist/server.js" "package.json" ".env.example")
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            print_error "Required file missing: $file"
            exit 1
        fi
    done
    
    # Test that the built application can start
    print_status "Testing application startup..."
    timeout 10s node dist/server.js &
    SERVER_PID=$!
    sleep 5
    
    if kill -0 $SERVER_PID 2>/dev/null; then
        print_status "Application startup test passed ✓"
        kill $SERVER_PID
    else
        print_error "Application failed to start"
        exit 1
    fi
}

# Create deployment package
create_deployment_package() {
    print_status "Creating deployment package..."
    
    # Create deployment directory
    mkdir -p deployment
    
    # Copy necessary files
    cp -r dist deployment/
    cp package.json deployment/
    cp package-lock.json deployment/
    cp .env.example deployment/
    cp README.md deployment/
    
    # Create production package.json (remove dev dependencies)
    node -e "
        const pkg = require('./package.json');
        delete pkg.devDependencies;
        pkg.scripts = {
            start: 'node dist/server.js',
            health: 'curl http://localhost:\${PORT:-3000}/health || exit 1'
        };
        require('fs').writeFileSync('deployment/package.json', JSON.stringify(pkg, null, 2));
    "
    
    print_status "Deployment package created ✓"
}

# Generate deployment documentation
generate_deployment_docs() {
    print_status "Generating deployment documentation..."
    
    cat > deployment/DEPLOYMENT.md << 'EOF'
# Deployment Guide

## Quick Start

1. Install dependencies:
   ```bash
   npm install --only=production
   ```

2. Set environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Start the application:
   ```bash
   npm start
   ```

## Environment Variables

Required:
- `GEMINI_API_KEY`: Google Gemini API key for AI analysis
- `NODE_ENV`: Set to 'production'

Optional:
- `PORT`: Server port (default: 3000)
- `MAX_FILE_SIZE`: Maximum CSV file size in bytes (default: 10MB)
- `MAX_LEADS_PER_UPLOAD`: Maximum leads per CSV (default: 1000)
- `LOG_LEVEL`: Logging level (default: info)
- `ALLOWED_ORIGINS`: CORS allowed origins (default: *)

## Health Checks

- Liveness: `GET /health/live`
- Readiness: `GET /health/ready`
- Full health: `GET /health`

## Monitoring

The application exposes metrics at `/health/metrics` for monitoring systems.

## Troubleshooting

1. Check application logs
2. Verify environment variables
3. Test health endpoints
4. Check AI service connectivity

For more details, see the main README.md file.
EOF

    print_status "Deployment documentation generated ✓"
}

# Main deployment function
main() {
    print_status "Lead Scoring Backend API - Deployment Preparation"
    print_status "================================================"
    
    check_env_vars
    install_dependencies
    build_application
    run_tests
    validate_deployment
    create_deployment_package
    generate_deployment_docs
    
    print_status ""
    print_status "🎉 Deployment preparation completed successfully!"
    print_status ""
    print_status "Next steps:"
    print_status "1. Upload the 'deployment' directory to your server"
    print_status "2. Set environment variables on the server"
    print_status "3. Run 'npm start' to start the application"
    print_status ""
    print_status "Deployment package location: ./deployment/"
}

# Run main function
main "$@"