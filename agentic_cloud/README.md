# Agentic Cloud - Marketing Website

A modern, production-ready marketing website for CallSphere's Agentic Cloud platform. Built with Next.js 15, TypeScript, Tailwind CSS, and Framer Motion.

**Live URL:** https://cloud.callsphere.tech

## Features

- **Modern Design**: Light theme with glossy gradients, glass morphism effects, and premium tech aesthetic
- **Interactive Demo**: PromptToPlanDemo component that generates architecture plans from natural language
- **Framer Motion Animations**: Smooth scroll reveals, hero animations, and micro-interactions
- **Fully Responsive**: Mobile-first design that looks great on all devices
- **SEO Optimized**: Proper metadata, sitemap.xml, and robots.txt
- **Waitlist Form**: Email capture with pluggable AWS SES integration

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home - Hero, features, demo, testimonials, FAQ |
| `/product` | How Agentic Cloud works + example prompts |
| `/services` | Service catalog grouped by category |
| `/pricing` | Pricing tiers and cost estimator |
| `/security` | Security features and compliance |
| `/docs` | Documentation shell (quickstart, API, CLI, examples) |
| `/waitlist` | Email capture form |
| `/company` | About, team, careers, contact |
| `/legal/privacy` | Privacy Policy |
| `/legal/terms` | Terms of Service |

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **UI Components**: Radix UI primitives with custom styling
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
cd /home/ubuntu/apps/agentic_cloud

# Install dependencies
npm install

# Start development server
npm run dev
```

The site will be available at http://localhost:3006

### Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Environment Variables

Create a `.env.local` file for local development:

```env
# AWS SES Configuration (for waitlist emails)
AWS_SES_ACCESS_KEY_ID=your_access_key
AWS_SES_SECRET_ACCESS_KEY=your_secret_key
AWS_SES_REGION=us-east-1
AWS_SES_FROM_EMAIL=noreply@callsphere.tech
```

## Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t agentic-cloud .
docker run -p 3006:3000 agentic-cloud
```

## Kubernetes Deployment (k3s)

Kubernetes manifests are located in `/home/ubuntu/apps/k3s/apps/agentic-cloud/`

### Quick Deploy

```bash
# Use the deployment script
cd /home/ubuntu/apps/k3s/apps/agentic-cloud

# Full deployment (build + deploy)
./deploy.sh full

# Or individual commands
./deploy.sh build    # Build Docker image
./deploy.sh deploy   # Deploy to k3s
./deploy.sh status   # Check deployment status
./deploy.sh logs     # View application logs
./deploy.sh restart  # Rolling restart
```

### Manual Deployment

```bash
# Build the Docker image
cd /home/ubuntu/apps/agentic_cloud
docker build -t agentic-cloud:latest .
docker tag agentic-cloud:latest localhost:5000/agentic-cloud:latest
docker push localhost:5000/agentic-cloud:latest

# Deploy to k3s
cd /home/ubuntu/apps/k3s/apps/agentic-cloud
kubectl apply -k .

# Check status
kubectl get all -n agentic-cloud
```

### Kubernetes Resources

| Resource | Description |
|----------|-------------|
| `namespace.yaml` | Creates `agentic-cloud` namespace |
| `configmap.yaml` | Non-sensitive environment configuration |
| `secret.yaml` | AWS SES credentials (needs real values) |
| `deployment.yaml` | Pod deployment with 2 replicas |
| `service.yaml` | ClusterIP service on port 80 |
| `ingress.yaml` | Traefik ingress with TLS |
| `hpa.yaml` | Horizontal Pod Autoscaler (2-10 replicas) |
| `pdb.yaml` | Pod Disruption Budget |
| `middleware.yaml` | Traefik security headers |

### DNS Configuration

For `cloud.callsphere.tech`:

1. **A Record**: Point to your cluster's external IP
2. **Or CNAME**: Point to your load balancer hostname

```bash
# Get external IP (if using LoadBalancer)
kubectl get svc -n kube-system traefik -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

### Prerequisites for k3s

1. **k3s Cluster** - Running k3s with Traefik ingress controller
2. **cert-manager** - For automatic TLS certificates
3. **Local Registry** - (optional) At `localhost:5000` for images

```bash
# Install cert-manager (if not already installed)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Create Let's Encrypt ClusterIssuer
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@callsphere.tech
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: traefik
EOF
```

### TLS Configuration

The ingress is configured with:
- Let's Encrypt SSL via cert-manager
- Traefik as the ingress controller
- Automatic TLS certificate provisioning
- Security headers middleware

## Project Structure

```
agentic_cloud/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── page.tsx           # Home page
│   │   ├── product/           # Product page
│   │   ├── services/          # Services catalog
│   │   ├── pricing/           # Pricing page
│   │   ├── security/          # Security page
│   │   ├── docs/              # Documentation
│   │   ├── waitlist/          # Waitlist form
│   │   ├── company/           # Company info
│   │   └── legal/             # Privacy & Terms
│   ├── components/
│   │   ├── ui/                # Reusable UI components
│   │   ├── layout/            # Navbar, Footer, Background
│   │   ├── sections/          # Page sections
│   │   └── demo/              # PromptToPlanDemo
│   ├── lib/                   # Utilities and data
│   └── types/                 # TypeScript types
├── public/                    # Static assets
├── Dockerfile                 # Container configuration
├── docker-compose.yml         # Docker Compose config
└── package.json
```

## Key Components

### PromptToPlanDemo

Interactive component that generates architecture plans from natural language:

```tsx
import { PromptToPlanDemo } from "@/components/demo/PromptToPlanDemo";

<PromptToPlanDemo
  showPresets={true}  // Show preset prompt chips
  compact={false}     // Full or compact mode
/>
```

### Waitlist Form

The waitlist form supports two modes:

1. **Default**: Stores submissions in-memory (for demo)
2. **Production**: Send confirmation via AWS SES (requires env vars)

See `src/app/waitlist/actions.ts` for implementation details.

## Customization

### Brand Colors

Edit `src/app/globals.css` to modify the color scheme:

```css
:root {
  --primary: 252 100% 60%;  /* Violet */
  /* ... other colors */
}
```

### Services Catalog

Edit `src/lib/services-data.ts` to modify the service catalog.

### Plan Generator

Edit `src/lib/plan-generator.ts` to modify the keyword matching and module generation logic.

## Performance

- **LCP**: Optimized with Next.js Image component
- **CLS**: Minimal layout shifts with proper sizing
- **FID**: Fast interactions with optimized JavaScript

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Create a feature branch
2. Make your changes
3. Run `npm run lint` to check for issues
4. Submit a pull request

## License

Copyright 2025 CallSphere Inc. All rights reserved.

---

**Last Updated:** January 2025
