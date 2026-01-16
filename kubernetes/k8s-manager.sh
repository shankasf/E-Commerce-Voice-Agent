#!/bin/bash

# Kubernetes Application Manager for CallSphere Apps
# This script manages all Kubernetes operations for your applications

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPS_DIR="/home/ubuntu/apps"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Initialize namespaces
init_namespaces() {
    print_header "Creating Namespaces"
    kubectl apply -f "$SCRIPT_DIR/namespaces/namespaces.yaml"
    print_success "All namespaces created"
}

# Build Docker images for an app
build_app() {
    local app=$1
    print_header "Building Docker image for $app"

    case $app in
        google-map)
            docker build -t google-map:latest "$APPS_DIR/google_map"
            ;;
        realestate-voice)
            docker build -t realestate-voice:latest "$APPS_DIR/realestate_voice"
            ;;
        salon)
            docker build -t salon-backend:latest "$APPS_DIR/salon/backend" 2>/dev/null || true
            docker build -t salon-frontend:latest "$APPS_DIR/salon/frontend" 2>/dev/null || true
            docker build -t salon-ai:latest "$APPS_DIR/salon/ai-service" 2>/dev/null || true
            ;;
        ticket-console)
            docker build -t ticket-console:latest "$APPS_DIR/ticket-console"
            ;;
        urackit-v2)
            docker build -t urackit-v2-backend:latest "$APPS_DIR/urackit_v2/backend"
            docker build -t urackit-v2-frontend:latest "$APPS_DIR/urackit_v2/frontend"
            docker build -t urackit-v2-ai:latest "$APPS_DIR/urackit_v2/ai-service"
            ;;
        healthcare-voice)
            docker build -t healthcare-voice-backend:latest "$APPS_DIR/healthcare_voice/backend"
            docker build -t healthcare-voice-frontend:latest "$APPS_DIR/healthcare_voice/frontend"
            docker build -t healthcare-voice-ai:latest "$APPS_DIR/healthcare_voice/ai-service"
            ;;
        afterhours-escalation)
            docker build -t escalation-backend:latest "$APPS_DIR/afterhours_escalation/backend" 2>/dev/null || true
            docker build -t escalation-frontend:latest "$APPS_DIR/afterhours_escalation/frontend"
            docker build -t escalation-ai:latest -f "$APPS_DIR/afterhours_escalation/ai-service/Dockerfile" "$APPS_DIR/afterhours_escalation"
            ;;
        quiz)
            docker build -t quiz-web:latest "$APPS_DIR/quiz/apps/web"
            docker build -t quiz-admin:latest "$APPS_DIR/quiz/apps/admin"
            docker build -t quiz-api:latest "$APPS_DIR/quiz/services/api"
            docker build -t quiz-ai:latest "$APPS_DIR/quiz/services/ai"
            ;;
        callsphere-website)
            docker build -t callsphere-frontend:latest "$APPS_DIR/call_sphere_official_website/frontend"
            ;;
        all)
            for a in google-map realestate-voice salon ticket-console urackit-v2 healthcare-voice afterhours-escalation quiz callsphere-website; do
                build_app "$a"
            done
            ;;
        *)
            print_error "Unknown app: $app"
            exit 1
            ;;
    esac

    print_success "Docker image(s) built for $app"
}

# Deploy an app to Kubernetes
deploy_app() {
    local app=$1
    print_header "Deploying $app to Kubernetes"

    kubectl apply -f "$SCRIPT_DIR/apps/$app/deployment.yaml"
    print_success "$app deployed"
}

# Deploy all apps
deploy_all() {
    print_header "Deploying All Applications"

    init_namespaces

    for app in google-map realestate-voice salon ticket-console urackit-v2 healthcare-voice afterhours-escalation quiz callsphere-website; do
        deploy_app "$app"
    done

    # Deploy ingress
    kubectl apply -f "$SCRIPT_DIR/ingress/ingress.yaml"

    print_success "All applications deployed"
}

# Stop/delete an app
delete_app() {
    local app=$1
    print_header "Deleting $app from Kubernetes"

    kubectl delete -f "$SCRIPT_DIR/apps/$app/deployment.yaml" --ignore-not-found
    print_success "$app deleted"
}

# Delete all apps
delete_all() {
    print_header "Deleting All Applications"

    for app in google-map realestate-voice salon ticket-console urackit-v2 healthcare-voice afterhours-escalation quiz callsphere-website; do
        delete_app "$app"
    done

    kubectl delete -f "$SCRIPT_DIR/ingress/ingress.yaml" --ignore-not-found

    print_success "All applications deleted"
}

# Check status of all apps
status() {
    print_header "Kubernetes Cluster Status"

    echo -e "\n${YELLOW}Nodes:${NC}"
    kubectl get nodes

    echo -e "\n${YELLOW}Namespaces:${NC}"
    kubectl get namespaces | grep -E "NAME|google-map|realestate|salon|ticket|urackit|healthcare|escalation|quiz|callsphere"

    echo -e "\n${YELLOW}All Pods:${NC}"
    kubectl get pods --all-namespaces | grep -E "NAMESPACE|google-map|realestate|salon|ticket|urackit|healthcare|escalation|quiz|callsphere"

    echo -e "\n${YELLOW}All Services:${NC}"
    kubectl get services --all-namespaces | grep -E "NAMESPACE|google-map|realestate|salon|ticket|urackit|healthcare|escalation|quiz|callsphere"
}

# Check for port conflicts
check_ports() {
    print_header "Port Conflict Check"

    echo -e "${YELLOW}NodePort Assignments:${NC}"
    kubectl get services --all-namespaces -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{.spec.type}{"\t"}{range .spec.ports[*]}{.nodePort}{" "}{end}{"\n"}{end}' 2>/dev/null | grep -v "^$" | sort -t$'\t' -k4 -n

    echo -e "\n${YELLOW}Checking for duplicate ports...${NC}"

    # Get all nodeports and check for duplicates
    local ports=$(kubectl get services --all-namespaces -o jsonpath='{range .items[*]}{range .spec.ports[*]}{.nodePort}{"\n"}{end}{end}' 2>/dev/null | grep -v "^$" | sort)
    local duplicates=$(echo "$ports" | uniq -d)

    if [ -n "$duplicates" ]; then
        print_error "Duplicate ports found:"
        echo "$duplicates"
    else
        print_success "No port conflicts detected"
    fi

    echo -e "\n${YELLOW}Port Usage Summary:${NC}"
    echo "NodePort Range: 30000-32767"
    echo "Ports in use: $(echo "$ports" | wc -l | tr -d ' ')"
}

# View logs for an app
logs() {
    local app=$1
    local namespace=$app

    if [ -z "$app" ]; then
        print_error "Please specify an app name"
        exit 1
    fi

    print_header "Logs for $app"
    kubectl logs -n "$namespace" -l app="$app" --all-containers --tail=100 -f
}

# Scale an app
scale() {
    local app=$1
    local replicas=$2
    local namespace=$app

    if [ -z "$app" ] || [ -z "$replicas" ]; then
        print_error "Usage: $0 scale <app> <replicas>"
        exit 1
    fi

    print_header "Scaling $app to $replicas replicas"
    kubectl scale deployment -n "$namespace" -l app="$app" --replicas="$replicas"
    print_success "$app scaled to $replicas replicas"
}

# Restart an app
restart() {
    local app=$1
    local namespace=$app

    if [ -z "$app" ]; then
        print_error "Please specify an app name"
        exit 1
    fi

    print_header "Restarting $app"
    kubectl rollout restart deployment -n "$namespace"
    print_success "$app restarted"
}

# Show help
show_help() {
    echo "Kubernetes Application Manager for CallSphere Apps"
    echo ""
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Commands:"
    echo "  init              Initialize namespaces"
    echo "  build <app|all>   Build Docker image(s) for an app"
    echo "  deploy <app>      Deploy a single app"
    echo "  deploy-all        Deploy all applications"
    echo "  delete <app>      Delete a single app"
    echo "  delete-all        Delete all applications"
    echo "  status            Show status of all apps"
    echo "  ports             Check for port conflicts"
    echo "  logs <app>        View logs for an app"
    echo "  scale <app> <n>   Scale an app to n replicas"
    echo "  restart <app>     Restart an app"
    echo "  help              Show this help message"
    echo ""
    echo "Apps:"
    echo "  google-map, realestate-voice, salon, ticket-console,"
    echo "  urackit-v2, healthcare-voice, afterhours-escalation, quiz, callsphere-website"
}

# Main command handler
case "${1:-help}" in
    init)
        init_namespaces
        ;;
    build)
        build_app "${2:-all}"
        ;;
    deploy)
        deploy_app "$2"
        ;;
    deploy-all)
        deploy_all
        ;;
    delete)
        delete_app "$2"
        ;;
    delete-all)
        delete_all
        ;;
    status)
        status
        ;;
    ports)
        check_ports
        ;;
    logs)
        logs "$2"
        ;;
    scale)
        scale "$2" "$3"
        ;;
    restart)
        restart "$2"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
