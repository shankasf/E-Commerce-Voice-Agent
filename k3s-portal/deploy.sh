#!/bin/bash

set -e

echo "=== K8s Portal Deployment Script ==="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directory paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
K8S_DIR="$SCRIPT_DIR/kubernetes"

# Build backend Docker image
echo -e "${YELLOW}Building backend Docker image...${NC}"
cd "$BACKEND_DIR"
docker build -t k3s-portal-backend:latest .
echo -e "${GREEN}Backend image built successfully${NC}"

# Build frontend Docker image
echo -e "${YELLOW}Building frontend Docker image...${NC}"
cd "$FRONTEND_DIR"
docker build -t k3s-portal-frontend:latest .
echo -e "${GREEN}Frontend image built successfully${NC}"

# Import images into k3s
echo -e "${YELLOW}Importing images into k3s...${NC}"
docker save k3s-portal-backend:latest | sudo k3s ctr images import -
docker save k3s-portal-frontend:latest | sudo k3s ctr images import -
echo -e "${GREEN}Images imported into k3s${NC}"

# Apply Kubernetes manifests
echo -e "${YELLOW}Applying Kubernetes manifests...${NC}"
cd "$K8S_DIR"

# Apply in order
kubectl apply -f namespace.yaml
echo "Namespace created/updated"

kubectl apply -f rbac.yaml
echo "RBAC configured"

kubectl apply -f secrets.yaml
echo "Secrets created/updated"

kubectl apply -f postgres.yaml
echo "PostgreSQL deployed"

# Wait for postgres to be ready
echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=postgres -n k3s-portal --timeout=120s

kubectl apply -f deployment.yaml
echo "Deployments created/updated"

kubectl apply -f service.yaml
echo "Services created/updated"

kubectl apply -f ingress.yaml
echo "Ingress created/updated"

# Wait for deployments to be ready
echo -e "${YELLOW}Waiting for deployments to be ready...${NC}"
kubectl wait --for=condition=available deployment/k3s-portal-backend -n k3s-portal --timeout=120s
kubectl wait --for=condition=available deployment/k3s-portal-frontend -n k3s-portal --timeout=120s

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
BACKEND_POD=$(kubectl get pods -n k3s-portal -l app.kubernetes.io/component=backend -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n k3s-portal "$BACKEND_POD" -- npx prisma migrate deploy

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "Access the portal at:"
echo "  - HTTPS: https://admin.callsphere.tech"
echo ""
echo "Check status with:"
echo "  kubectl get pods -n k3s-portal"
echo "  kubectl get svc -n k3s-portal"
echo "  kubectl get ingress -n k3s-portal"
echo ""
