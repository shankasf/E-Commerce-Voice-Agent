# Agentic Cloud - Kubernetes Deployment

Kubernetes manifests for deploying the Agentic Cloud marketing website on k3s.

## Prerequisites

- k3s cluster running
- kubectl configured to access the cluster
- Docker installed (for building images)
- Local registry at `localhost:5000` (optional, can use other registries)

## Quick Start

```bash
# Full deployment (build + deploy)
./deploy.sh full

# Or step by step:
./deploy.sh build    # Build Docker image
./deploy.sh deploy   # Deploy to k3s
./deploy.sh status   # Check status
./deploy.sh logs     # View logs
```

## Directory Structure

```
agentic-cloud/
├── kustomization.yaml  # Kustomize configuration
├── namespace.yaml      # Namespace definition
├── configmap.yaml      # Environment configuration
├── secret.yaml         # Sensitive environment variables (SES credentials)
├── deployment.yaml     # Pod deployment specification
├── service.yaml        # ClusterIP service
├── ingress.yaml        # Traefik ingress with TLS
├── hpa.yaml            # Horizontal Pod Autoscaler
├── pdb.yaml            # Pod Disruption Budget
├── middleware.yaml     # Traefik security headers middleware
├── deploy.sh           # Deployment automation script
└── README.md           # This file
```

## Configuration

### Environment Variables

Edit `secret.yaml` to configure AWS SES for waitlist emails:

```yaml
stringData:
  AWS_SES_ACCESS_KEY_ID: "your-access-key-id"
  AWS_SES_SECRET_ACCESS_KEY: "your-secret-access-key"
  AWS_SES_REGION: "us-east-1"
  AWS_SES_FROM_EMAIL: "noreply@callsphere.tech"
```

### Image Registry

By default, the deployment uses `localhost:5000/agentic-cloud:latest`.

To use a different registry, edit `kustomization.yaml`:

```yaml
images:
  - name: agentic-cloud
    newName: your-registry.com/agentic-cloud
    newTag: v1.0.0
```

### TLS Certificate

The ingress is configured to use cert-manager with Let's Encrypt. Ensure you have:

1. cert-manager installed
2. A ClusterIssuer named `letsencrypt-prod`

```bash
# Check cert-manager
kubectl get pods -n cert-manager

# Check ClusterIssuer
kubectl get clusterissuer
```

## Manual Deployment

```bash
# Apply all resources
kubectl apply -k .

# Or apply individually
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f middleware.yaml
kubectl apply -f ingress.yaml
kubectl apply -f hpa.yaml
kubectl apply -f pdb.yaml
```

## Scaling

### Horizontal Pod Autoscaler

The HPA is configured to:
- Minimum: 2 replicas
- Maximum: 10 replicas
- Scale up at 70% CPU or 80% memory utilization

```bash
# Check HPA status
kubectl get hpa -n agentic-cloud

# Manual scaling
kubectl scale deployment agentic-cloud -n agentic-cloud --replicas=5
```

### Pod Disruption Budget

PDB ensures at least 1 pod is always available during voluntary disruptions.

## Monitoring

```bash
# Check deployment status
kubectl get all -n agentic-cloud

# View logs
kubectl logs -n agentic-cloud -l app.kubernetes.io/name=agentic-cloud -f

# Describe deployment
kubectl describe deployment agentic-cloud -n agentic-cloud

# Check ingress
kubectl describe ingress agentic-cloud -n agentic-cloud
```

## Troubleshooting

### Pod not starting

```bash
# Check pod events
kubectl describe pod -n agentic-cloud -l app.kubernetes.io/name=agentic-cloud

# Check container logs
kubectl logs -n agentic-cloud -l app.kubernetes.io/name=agentic-cloud --previous
```

### Ingress not working

```bash
# Check Traefik logs
kubectl logs -n kube-system -l app.kubernetes.io/name=traefik

# Verify TLS certificate
kubectl get certificate -n agentic-cloud
kubectl describe certificate agentic-cloud-tls -n agentic-cloud
```

### Image pull issues

```bash
# Check if image exists
docker images | grep agentic-cloud

# Push to local registry
docker push localhost:5000/agentic-cloud:latest
```

## DNS Configuration

Point `cloud.callsphere.tech` to your k3s cluster:

### Option 1: A Record
```
cloud.callsphere.tech  A  <cluster-external-ip>
```

### Option 2: CNAME (if using load balancer)
```
cloud.callsphere.tech  CNAME  <load-balancer-hostname>
```

## Resource Limits

| Resource | Request | Limit |
|----------|---------|-------|
| CPU      | 100m    | 500m  |
| Memory   | 128Mi   | 512Mi |

Adjust in `deployment.yaml` based on actual usage.

## Security Features

- Non-root container execution
- Read-only capabilities
- Security headers via Traefik middleware
- TLS encryption with Let's Encrypt
- Network policy ready

## Cleanup

```bash
# Delete all resources
./deploy.sh delete

# Or manually
kubectl delete -k .
```

## Related

- Application source: `/home/ubuntu/apps/agentic_cloud`
- Main documentation: `/home/ubuntu/apps/agentic_cloud/README.md`

---

**Last Updated:** January 2026
