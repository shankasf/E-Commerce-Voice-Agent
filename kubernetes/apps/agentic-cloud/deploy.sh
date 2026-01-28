#!/bin/bash
# Deployment script for Agentic Cloud on k3s
# Usage: ./deploy.sh [build|deploy|full|logs|status]

set -e

APP_NAME="agentic-cloud"
NAMESPACE="agentic-cloud"
APP_DIR="/home/ubuntu/apps/agentic_cloud"
K8S_DIR="/home/ubuntu/apps/kubernetes/apps/agentic-cloud"
REGISTRY="localhost:5000"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

build_image() {
    log_info "Building Docker image..."
    cd "$APP_DIR"

    # Build the image
    docker build -t ${APP_NAME}:latest .

    # Tag for local registry
    docker tag ${APP_NAME}:latest ${REGISTRY}/${APP_NAME}:latest

    # Push to local registry (if available)
    if docker push ${REGISTRY}/${APP_NAME}:latest 2>/dev/null; then
        log_info "Image pushed to local registry"
    else
        log_warn "Local registry not available, using local image"
    fi

    log_info "Docker image built successfully"
}

deploy_k8s() {
    log_info "Deploying to Kubernetes..."
    cd "$K8S_DIR"

    # Apply kustomization
    kubectl apply -k .

    # Wait for deployment
    log_info "Waiting for deployment to be ready..."
    kubectl rollout status deployment/${APP_NAME} -n ${NAMESPACE} --timeout=300s

    log_info "Deployment completed successfully"
}

show_status() {
    log_info "Deployment Status:"
    echo ""

    echo "=== Pods ==="
    kubectl get pods -n ${NAMESPACE} -o wide
    echo ""

    echo "=== Services ==="
    kubectl get svc -n ${NAMESPACE}
    echo ""

    echo "=== Ingress ==="
    kubectl get ingress -n ${NAMESPACE}
    echo ""

    echo "=== HPA ==="
    kubectl get hpa -n ${NAMESPACE}
}

show_logs() {
    log_info "Showing logs for ${APP_NAME}..."
    kubectl logs -n ${NAMESPACE} -l app.kubernetes.io/name=${APP_NAME} --tail=100 -f
}

restart_deployment() {
    log_info "Restarting deployment..."
    kubectl rollout restart deployment/${APP_NAME} -n ${NAMESPACE}
    kubectl rollout status deployment/${APP_NAME} -n ${NAMESPACE} --timeout=300s
    log_info "Restart completed"
}

delete_deployment() {
    log_warn "Deleting deployment..."
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kubectl delete -k "$K8S_DIR"
        log_info "Deployment deleted"
    else
        log_info "Cancelled"
    fi
}

show_help() {
    echo "Agentic Cloud Deployment Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  build     Build Docker image"
    echo "  deploy    Deploy to Kubernetes"
    echo "  full      Build and deploy"
    echo "  status    Show deployment status"
    echo "  logs      Show application logs"
    echo "  restart   Restart deployment"
    echo "  delete    Delete deployment"
    echo "  help      Show this help message"
}

# Main
case "${1:-full}" in
    build)
        build_image
        ;;
    deploy)
        deploy_k8s
        ;;
    full)
        build_image
        deploy_k8s
        show_status
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    restart)
        restart_deployment
        ;;
    delete)
        delete_deployment
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
