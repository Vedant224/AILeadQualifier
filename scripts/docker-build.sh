#!/bin/bash

# Docker Build and Management Script
# Handles building, running, and managing Docker containers

set -e

# Configuration
IMAGE_NAME="lead-scoring-backend"
CONTAINER_NAME="lead-scoring-api"
TAG=${TAG:-"latest"}
PORT=${PORT:-3000}

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}[DOCKER]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Build Docker image
build_image() {
    print_header "Building Docker image: $IMAGE_NAME:$TAG"
    
    docker build \
        --tag "$IMAGE_NAME:$TAG" \
        --target production \
        --build-arg NODE_ENV=production \
        .
    
    print_success "Docker image built successfully"
}

# Build development image
build_dev_image() {
    print_header "Building development Docker image: $IMAGE_NAME:dev"
    
    docker build \
        --tag "$IMAGE_NAME:dev" \
        --target builder \
        .
    
    print_success "Development Docker image built successfully"
}

# Run container
run_container() {
    print_header "Running Docker container: $CONTAINER_NAME"
    
    # Stop existing container if running
    if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
        print_warning "Stopping existing container"
        docker stop "$CONTAINER_NAME"
        docker rm "$CONTAINER_NAME"
    fi
    
    # Check if .env file exists
    ENV_FILE=""
    if [ -f ".env" ]; then
        ENV_FILE="--env-file .env"
        print_header "Using .env file for environment variables"
    else
        print_warning "No .env file found, using default environment"
    fi
    
    # Run container
    docker run \
        --detach \
        --name "$CONTAINER_NAME" \
        --port "$PORT:3000" \
        $ENV_FILE \
        --restart unless-stopped \
        "$IMAGE_NAME:$TAG"
    
    print_success "Container started successfully"
    print_header "Container is running at http://localhost:$PORT"
}

# Run development container
run_dev_container() {
    print_header "Running development Docker container"
    
    docker run \
        --rm \
        --interactive \
        --tty \
        --name "$CONTAINER_NAME-dev" \
        --port "$PORT:3000" \
        --volume "$(pwd):/app" \
        --volume "/app/node_modules" \
        --env NODE_ENV=development \
        --env-file .env \
        "$IMAGE_NAME:dev" \
        npm run dev
}

# Stop container
stop_container() {
    print_header "Stopping Docker container: $CONTAINER_NAME"
    
    if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
        docker stop "$CONTAINER_NAME"
        docker rm "$CONTAINER_NAME"
        print_success "Container stopped and removed"
    else
        print_warning "Container is not running"
    fi
}

# Show container logs
show_logs() {
    print_header "Showing logs for container: $CONTAINER_NAME"
    docker logs -f "$CONTAINER_NAME"
}

# Test container health
test_health() {
    print_header "Testing container health"
    
    # Wait for container to start
    sleep 5
    
    # Test health endpoint
    if curl -f -s "http://localhost:$PORT/health/live" > /dev/null; then
        print_success "Container is healthy"
        return 0
    else
        print_error "Container health check failed"
        return 1
    fi
}

# Clean up Docker resources
cleanup() {
    print_header "Cleaning up Docker resources"
    
    # Remove stopped containers
    docker container prune -f
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes
    docker volume prune -f
    
    print_success "Docker cleanup completed"
}

# Show container status
status() {
    print_header "Docker container status"
    
    echo "Images:"
    docker images | grep "$IMAGE_NAME" || echo "No images found"
    
    echo ""
    echo "Containers:"
    docker ps -a | grep "$IMAGE_NAME" || echo "No containers found"
    
    echo ""
    echo "Running containers:"
    docker ps | grep "$IMAGE_NAME" || echo "No running containers found"
}

# Push image to registry
push_image() {
    local registry=${1:-""}
    
    if [ -z "$registry" ]; then
        print_error "Registry URL required for push command"
        exit 1
    fi
    
    local full_image_name="$registry/$IMAGE_NAME:$TAG"
    
    print_header "Tagging image for registry: $full_image_name"
    docker tag "$IMAGE_NAME:$TAG" "$full_image_name"
    
    print_header "Pushing image to registry"
    docker push "$full_image_name"
    
    print_success "Image pushed successfully"
}

# Show help
show_help() {
    echo "Docker Build and Management Script for Lead Scoring Backend API"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  build           Build production Docker image"
    echo "  build-dev       Build development Docker image"
    echo "  run             Run production container"
    echo "  run-dev         Run development container with hot reload"
    echo "  stop            Stop and remove container"
    echo "  logs            Show container logs"
    echo "  health          Test container health"
    echo "  status          Show Docker resources status"
    echo "  cleanup         Clean up unused Docker resources"
    echo "  push [REGISTRY] Push image to registry"
    echo "  help            Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  TAG             Docker image tag (default: latest)"
    echo "  PORT            Host port to bind (default: 3000)"
    echo ""
    echo "Examples:"
    echo "  $0 build"
    echo "  $0 run"
    echo "  TAG=v1.0.0 $0 build"
    echo "  PORT=8080 $0 run"
    echo "  $0 push docker.io/myuser"
}

# Main function
main() {
    case "${1:-help}" in
        "build")
            build_image
            ;;
        "build-dev")
            build_dev_image
            ;;
        "run")
            run_container
            ;;
        "run-dev")
            run_dev_container
            ;;
        "stop")
            stop_container
            ;;
        "logs")
            show_logs
            ;;
        "health")
            test_health
            ;;
        "status")
            status
            ;;
        "cleanup")
            cleanup
            ;;
        "push")
            push_image "$2"
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function
main "$@"