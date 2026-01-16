import type { PlanResult, ArchitectureModule, ServiceCategory } from "@/types";

interface KeywordModule {
  keywords: string[];
  module: ArchitectureModule;
}

const moduleDatabase: KeywordModule[] = [
  // Compute
  {
    keywords: ["next", "nextjs", "react", "vue", "angular", "frontend", "web app", "application", "app"],
    module: {
      id: "container-app",
      name: "Container App",
      category: "compute",
      description: "Containerized web application with auto-scaling",
      estimatedCost: { min: 20, max: 80 },
    },
  },
  {
    keywords: ["node", "express", "api", "backend", "server", "rest", "graphql"],
    module: {
      id: "api-server",
      name: "API Server",
      category: "compute",
      description: "Backend API server with load balancing",
      estimatedCost: { min: 25, max: 100 },
    },
  },
  {
    keywords: ["kubernetes", "k8s", "cluster", "orchestration"],
    module: {
      id: "k8s-cluster",
      name: "Kubernetes Cluster",
      category: "compute",
      description: "Managed Kubernetes cluster",
      estimatedCost: { min: 150, max: 500 },
    },
  },
  {
    keywords: ["gpu", "ml", "machine learning", "ai", "training", "inference"],
    module: {
      id: "gpu-compute",
      name: "GPU Compute",
      category: "compute",
      description: "GPU instances for ML workloads",
      estimatedCost: { min: 200, max: 800 },
    },
  },

  // Databases
  {
    keywords: ["postgres", "postgresql", "database", "db", "sql"],
    module: {
      id: "postgres-db",
      name: "PostgreSQL Database",
      category: "databases",
      description: "Managed PostgreSQL with HA and backups",
      estimatedCost: { min: 25, max: 150 },
    },
  },
  {
    keywords: ["mysql", "mariadb"],
    module: {
      id: "mysql-db",
      name: "MySQL Database",
      category: "databases",
      description: "Managed MySQL with replication",
      estimatedCost: { min: 25, max: 150 },
    },
  },
  {
    keywords: ["vector", "embeddings", "semantic", "similarity", "pgvector"],
    module: {
      id: "vector-db",
      name: "Vector Database",
      category: "databases",
      description: "Vector storage for AI embeddings",
      estimatedCost: { min: 30, max: 120 },
    },
  },

  // Cache
  {
    keywords: ["redis", "cache", "caching", "session", "memcached"],
    module: {
      id: "redis-cache",
      name: "Redis Cache",
      category: "cache",
      description: "High-performance Redis cache cluster",
      estimatedCost: { min: 15, max: 80 },
    },
  },

  // Storage
  {
    keywords: ["storage", "s3", "bucket", "files", "uploads", "object storage", "media"],
    module: {
      id: "object-storage",
      name: "Object Storage",
      category: "storage",
      description: "S3-compatible object storage",
      estimatedCost: { min: 5, max: 50 },
    },
  },
  {
    keywords: ["volume", "disk", "ssd", "block storage"],
    module: {
      id: "block-storage",
      name: "Block Storage",
      category: "storage",
      description: "High-performance SSD volumes",
      estimatedCost: { min: 10, max: 60 },
    },
  },
  {
    keywords: ["backup", "backups", "recovery", "disaster"],
    module: {
      id: "backups",
      name: "Automated Backups",
      category: "storage",
      description: "Scheduled backups with PITR",
      estimatedCost: { min: 10, max: 40 },
    },
  },

  // Serverless
  {
    keywords: ["function", "functions", "lambda", "serverless", "faas"],
    module: {
      id: "functions",
      name: "Serverless Functions",
      category: "serverless",
      description: "Event-driven functions",
      estimatedCost: { min: 5, max: 50 },
    },
  },
  {
    keywords: ["cron", "scheduled", "job", "task", "background"],
    module: {
      id: "cron-jobs",
      name: "Cron Jobs",
      category: "serverless",
      description: "Scheduled background tasks",
      estimatedCost: { min: 5, max: 25 },
    },
  },

  // CDN & Edge
  {
    keywords: ["cdn", "edge", "content delivery", "static", "assets"],
    module: {
      id: "cdn",
      name: "CDN",
      category: "cdn",
      description: "Global content delivery network",
      estimatedCost: { min: 10, max: 80 },
    },
  },
  {
    keywords: ["edge function", "edge compute", "edge worker"],
    module: {
      id: "edge-functions",
      name: "Edge Functions",
      category: "cdn",
      description: "Code execution at the edge",
      estimatedCost: { min: 10, max: 50 },
    },
  },

  // Domains & DNS
  {
    keywords: ["domain", "dns", "custom domain"],
    module: {
      id: "domain",
      name: "Domain & DNS",
      category: "domains",
      description: "Domain with DNS management",
      estimatedCost: { min: 12, max: 20 },
    },
  },
  {
    keywords: ["ssl", "https", "tls", "certificate"],
    module: {
      id: "ssl",
      name: "SSL Certificate",
      category: "domains",
      description: "Auto-renewed SSL certificates",
      estimatedCost: { min: 0, max: 0 },
    },
  },

  // Networking
  {
    keywords: ["vpc", "network", "private network", "subnet"],
    module: {
      id: "vpc",
      name: "VPC",
      category: "networking",
      description: "Isolated virtual network",
      estimatedCost: { min: 0, max: 20 },
    },
  },
  {
    keywords: ["load balancer", "lb", "balancing", "traffic"],
    module: {
      id: "load-balancer",
      name: "Load Balancer",
      category: "networking",
      description: "Application load balancer",
      estimatedCost: { min: 15, max: 50 },
    },
  },

  // Security
  {
    keywords: ["auth", "authentication", "login", "sso", "iam", "rbac"],
    module: {
      id: "iam",
      name: "IAM / RBAC",
      category: "security",
      description: "Identity and access management",
      estimatedCost: { min: 0, max: 30 },
    },
  },
  {
    keywords: ["secret", "secrets", "env", "environment", "api key", "credentials"],
    module: {
      id: "secrets",
      name: "Secrets Manager",
      category: "security",
      description: "Secure secrets storage",
      estimatedCost: { min: 5, max: 20 },
    },
  },
  {
    keywords: ["waf", "firewall", "ddos", "protection", "security"],
    module: {
      id: "waf",
      name: "WAF & DDoS Protection",
      category: "security",
      description: "Web application firewall",
      estimatedCost: { min: 20, max: 100 },
    },
  },

  // Observability
  {
    keywords: ["log", "logs", "logging", "observability"],
    module: {
      id: "logs",
      name: "Centralized Logs",
      category: "observability",
      description: "Log aggregation and search",
      estimatedCost: { min: 10, max: 50 },
    },
  },
  {
    keywords: ["metric", "metrics", "monitoring", "dashboard"],
    module: {
      id: "metrics",
      name: "Metrics & Dashboards",
      category: "observability",
      description: "Application metrics and dashboards",
      estimatedCost: { min: 10, max: 50 },
    },
  },
  {
    keywords: ["trace", "tracing", "apm", "performance"],
    module: {
      id: "tracing",
      name: "Distributed Tracing",
      category: "observability",
      description: "End-to-end request tracing",
      estimatedCost: { min: 15, max: 60 },
    },
  },
  {
    keywords: ["alert", "alerts", "alerting", "notification", "pagerduty", "slack"],
    module: {
      id: "alerting",
      name: "Alerting",
      category: "observability",
      description: "Intelligent alerting system",
      estimatedCost: { min: 5, max: 30 },
    },
  },

  // Queues
  {
    keywords: ["queue", "message", "async", "background job", "worker"],
    module: {
      id: "queue",
      name: "Message Queue",
      category: "queues",
      description: "Reliable message queue",
      estimatedCost: { min: 10, max: 50 },
    },
  },
  {
    keywords: ["pubsub", "pub/sub", "event", "streaming", "real-time"],
    module: {
      id: "pubsub",
      name: "Pub/Sub",
      category: "queues",
      description: "Event streaming",
      estimatedCost: { min: 10, max: 50 },
    },
  },

  // CI/CD
  {
    keywords: ["deploy", "deployment", "ci/cd", "pipeline", "gitops"],
    module: {
      id: "cicd",
      name: "Deploy Pipeline",
      category: "cicd",
      description: "Automated CI/CD pipeline",
      estimatedCost: { min: 0, max: 30 },
    },
  },

  // Scaling
  {
    keywords: ["scale", "scaling", "autoscale", "auto-scale", "scalable"],
    module: {
      id: "autoscaling",
      name: "Auto-Scaling",
      category: "compute",
      description: "Automatic horizontal scaling",
      estimatedCost: { min: 0, max: 0 },
    },
  },
];

function findMatchingModules(prompt: string): ArchitectureModule[] {
  const lowerPrompt = prompt.toLowerCase();
  const matchedModules: ArchitectureModule[] = [];
  const matchedIds = new Set<string>();

  for (const item of moduleDatabase) {
    for (const keyword of item.keywords) {
      if (lowerPrompt.includes(keyword) && !matchedIds.has(item.module.id)) {
        matchedModules.push(item.module);
        matchedIds.add(item.module.id);
        break;
      }
    }
  }

  return matchedModules;
}

function determineTier(totalMin: number): "starter" | "growth" | "scale" | "enterprise" {
  if (totalMin < 100) return "starter";
  if (totalMin < 500) return "growth";
  if (totalMin < 2000) return "scale";
  return "enterprise";
}

function generateSteps(modules: ArchitectureModule[]): string[] {
  const steps: string[] = [];
  const categories = new Set(modules.map(m => m.category));

  // Infra first
  if (categories.has("networking")) {
    steps.push("1. Provision VPC and networking infrastructure");
  }
  if (categories.has("domains")) {
    steps.push(`${steps.length + 1}. Configure domain and SSL certificates`);
  }

  // Data layer
  if (categories.has("databases") || categories.has("cache") || categories.has("storage")) {
    steps.push(`${steps.length + 1}. Deploy data layer (databases, cache, storage)`);
  }

  // Queues
  if (categories.has("queues")) {
    steps.push(`${steps.length + 1}. Set up message queues and event streaming`);
  }

  // Compute
  if (categories.has("compute") || categories.has("serverless")) {
    steps.push(`${steps.length + 1}. Deploy compute resources and applications`);
  }

  // CDN
  if (categories.has("cdn")) {
    steps.push(`${steps.length + 1}. Configure CDN and edge caching`);
  }

  // Security
  if (categories.has("security")) {
    steps.push(`${steps.length + 1}. Apply security policies and access controls`);
  }

  // Observability
  if (categories.has("observability")) {
    steps.push(`${steps.length + 1}. Enable observability (logs, metrics, tracing)`);
  }

  // CI/CD
  if (categories.has("cicd")) {
    steps.push(`${steps.length + 1}. Configure CI/CD pipelines`);
  }

  // Final
  steps.push(`${steps.length + 1}. Validate deployment and run health checks`);

  return steps;
}

export function generatePlan(prompt: string): PlanResult | null {
  if (!prompt.trim()) return null;

  const modules = findMatchingModules(prompt);

  if (modules.length === 0) {
    // Default modules for generic prompts
    const defaultModules: ArchitectureModule[] = [
      moduleDatabase.find(m => m.module.id === "container-app")!.module,
      moduleDatabase.find(m => m.module.id === "postgres-db")!.module,
      moduleDatabase.find(m => m.module.id === "logs")!.module,
      moduleDatabase.find(m => m.module.id === "cicd")!.module,
    ];
    modules.push(...defaultModules);
  }

  const totalMin = modules.reduce((sum, m) => sum + m.estimatedCost.min, 0);
  const totalMax = modules.reduce((sum, m) => sum + m.estimatedCost.max, 0);
  const tier = determineTier(totalMin);
  const steps = generateSteps(modules);

  return {
    modules,
    totalEstimate: { min: totalMin, max: totalMax },
    tier,
    steps,
  };
}

export const presetPrompts = [
  {
    label: "Next.js + Auth + DB",
    prompt: "Launch a scalable Next.js app with auth, Postgres, Redis cache, object storage, CDN, custom domain, WAF, and observability. Start small but auto-scale.",
  },
  {
    label: "API Backend",
    prompt: "Deploy a Node.js REST API with PostgreSQL, Redis caching, load balancer, secrets management, and monitoring with alerts.",
  },
  {
    label: "ML Platform",
    prompt: "Create a machine learning platform with GPU instances for training, vector database for embeddings, object storage for datasets, and distributed tracing.",
  },
  {
    label: "Microservices",
    prompt: "Set up a Kubernetes cluster for microservices with service mesh, message queues, centralized logging, metrics dashboards, and GitOps deployment.",
  },
  {
    label: "Static Website",
    prompt: "Deploy a static website with custom domain, SSL, global CDN, edge functions for API routes, and analytics.",
  },
  {
    label: "Real-time App",
    prompt: "Build a real-time application with WebSocket support, Redis pub/sub, PostgreSQL, auto-scaling containers, and DDoS protection.",
  },
];
