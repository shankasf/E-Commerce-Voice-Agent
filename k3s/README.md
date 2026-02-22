# Kubernetes Infrastructure for CallSphere Apps

This directory contains the complete Kubernetes configuration for managing all CallSphere applications with automatic port conflict detection and centralized management.

## Quick Start

```bash
# 1. Initialize namespaces
./k3s-manager.sh init

# 2. Build all Docker images
./k3s-manager.sh build all

# 3. Deploy all applications
./k3s-manager.sh deploy-all

# 4. Check status
./k3s-manager.sh status
```

## Directory Structure

```
kubernetes/
├── namespaces/
│   └── namespaces.yaml      # All application namespaces
├── apps/
│   ├── google-map/          # Google Maps Agent
│   ├── realestate-voice/    # Real Estate Voice Agent
│   ├── salon/               # GlamBook Salon (multi-service)
│   ├── ticket-console/      # Ticket Console
│   ├── urackit-v2/          # URackIT V2 (multi-service)
│   ├── healthcare-voice/    # Healthcare Voice (multi-service)
│   ├── afterhours-escalation/ # Escalation System (multi-service)
│   ├── quiz/                # Quiz Application (multi-service)
│   └── callsphere-website/  # Main Website
├── ingress/
│   └── ingress.yaml         # Traefik ingress rules
├── shared/
│   └── port-registry.yaml   # Central port configuration
├── k3s-manager.sh           # Main management script
├── port-checker.sh          # Port conflict checker
└── README.md
```

## Port Assignments

All NodePorts are assigned from the 30000-32767 range:

| Application | Service | NodePort | Internal Port |
|-------------|---------|----------|---------------|
| CallSphere Website | web | 30000 | 3000 |
| Ticket Console | web | 30001 | 3001 |
| URackIT V2 | backend | 30003 | 3003 |
| URackIT V2 | frontend | 30004 | 80 |
| Healthcare Voice | backend | 30005 | 3005 |
| Healthcare Voice | frontend | 30006 | 80 |
| Google Map | api | 30010 | 3000 |
| Salon | backend | 30020 | 3000 |
| Salon | frontend | 30021 | 80 |
| Escalation | backend | 30040 | 3004 |
| Escalation | frontend | 30041 | 80 |
| Escalation | ai | 30083 | 8083 |
| Healthcare Voice | ai | 30084 | 8084 |
| Salon | ai | 30086 | 8000 |
| URackIT V2 | ai | 30088 | 8081 |
| Realestate Voice | api | 30089 | 8089 |
| Quiz | web | 30180 | 80 |
| Quiz | admin | 30181 | 80 |
| Quiz | api | 30400 | 4000 |

## Management Commands

### k3s-manager.sh

```bash
# Initialize namespaces
./k3s-manager.sh init

# Build Docker images
./k3s-manager.sh build <app|all>

# Deploy applications
./k3s-manager.sh deploy <app>
./k3s-manager.sh deploy-all

# Delete applications
./k3s-manager.sh delete <app>
./k3s-manager.sh delete-all

# Check status
./k3s-manager.sh status

# Check ports
./k3s-manager.sh ports

# View logs
./k3s-manager.sh logs <app>

# Scale application
./k3s-manager.sh scale <app> <replicas>

# Restart application
./k3s-manager.sh restart <app>
```

### port-checker.sh

```bash
# Run all port checks
./port-checker.sh all

# Check port registry
./port-checker.sh registry

# Check system ports
./port-checker.sh system

# Check Kubernetes ports
./port-checker.sh k8s

# Print port map
./port-checker.sh map

# Suggest next available port
./port-checker.sh suggest frontend
./port-checker.sh suggest backend
./port-checker.sh suggest ai
```

## Adding a New Application

1. **Reserve ports** in `shared/port-registry.yaml`
2. **Check for conflicts**: `./port-checker.sh registry`
3. **Create namespace** in `namespaces/namespaces.yaml`
4. **Create deployment** in `apps/<app-name>/deployment.yaml`
5. **Add ingress rules** in `ingress/ingress.yaml`
6. **Update k3s-manager.sh** with build/deploy commands
7. **Deploy**: `./k3s-manager.sh deploy <app-name>`

## Local Development with Ingress

Add to `/etc/hosts` for local access:
```
127.0.0.1 callsphere.local
127.0.0.1 google-map.local
127.0.0.1 realestate.local
127.0.0.1 salon.local
127.0.0.1 tickets.local
127.0.0.1 urackit.local
127.0.0.1 healthcare.local
127.0.0.1 escalation.local
127.0.0.1 quiz.local
```

## Kubernetes Features

- **Namespace Isolation**: Each app runs in its own namespace
- **Resource Limits**: CPU and memory limits configured
- **Health Checks**: Liveness and readiness probes
- **Auto-restart**: Containers restart on failure
- **Service Discovery**: Apps communicate via service names
- **Ingress Routing**: Path-based routing with Traefik
- **Persistent Storage**: PVCs for databases and data

## Troubleshooting

```bash
# Check pod status
kubectl get pods -n <namespace>

# Describe pod for errors
kubectl describe pod <pod-name> -n <namespace>

# View pod logs
kubectl logs <pod-name> -n <namespace>

# Execute into a pod
kubectl exec -it <pod-name> -n <namespace> -- /bin/sh

# Check service endpoints
kubectl get endpoints -n <namespace>

# Check ingress status
kubectl get ingress --all-namespaces
```

## k3s Management

```bash
# Check k3s status
sudo systemctl status k3s

# Restart k3s
sudo systemctl restart k3s

# View k3s logs
sudo journalctl -u k3s -f

# Uninstall k3s
/usr/local/bin/k3s-uninstall.sh
```
