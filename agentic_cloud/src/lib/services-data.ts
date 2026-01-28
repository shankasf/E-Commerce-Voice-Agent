import type { Service, ServiceCategoryInfo } from "@/types";

export const serviceCategories: ServiceCategoryInfo[] = [
  {
    id: "domains",
    name: "Domains & DNS",
    description: "Register domains, manage DNS records, and secure with SSL certificates",
    icon: "Globe",
  },
  {
    id: "compute",
    name: "Compute",
    description: "Scalable containers, VMs, and GPU/CPU instances for any workload",
    icon: "Cpu",
  },
  {
    id: "serverless",
    name: "Serverless",
    description: "Functions and scheduled tasks that scale automatically",
    icon: "Zap",
  },
  {
    id: "storage",
    name: "Storage",
    description: "Object storage, volumes, and automated backups",
    icon: "HardDrive",
  },
  {
    id: "databases",
    name: "Databases",
    description: "Managed PostgreSQL, MySQL, and vector databases",
    icon: "Database",
  },
  {
    id: "cache",
    name: "Cache",
    description: "High-performance Redis caching for faster applications",
    icon: "Layers",
  },
  {
    id: "queues",
    name: "Queues & Streams",
    description: "Pub/sub messaging and task queues for async processing",
    icon: "GitBranch",
  },
  {
    id: "networking",
    name: "Networking",
    description: "VPC, load balancers, and private service connections",
    icon: "Network",
  },
  {
    id: "cdn",
    name: "CDN & Edge",
    description: "Global content delivery and edge computing",
    icon: "Globe2",
  },
  {
    id: "security",
    name: "Security",
    description: "IAM, secrets management, WAF, and DDoS protection",
    icon: "Shield",
  },
  {
    id: "observability",
    name: "Observability",
    description: "Logs, metrics, traces, and intelligent alerting",
    icon: "Activity",
  },
  {
    id: "cicd",
    name: "CI/CD",
    description: "Automated deployment pipelines and GitOps workflows",
    icon: "Rocket",
  },
];

export const services: Service[] = [
  // Domains & DNS
  {
    id: "domain-registration",
    name: "Domain Registration",
    category: "domains",
    description: "Register and manage domains with instant DNS propagation",
    icon: "Globe",
    examples: [
      "Register myapp.com with DNS",
      "Set up domain with Cloudflare integration",
    ],
    features: ["100+ TLDs supported", "Auto-renewal", "WHOIS privacy"],
  },
  {
    id: "dns-management",
    name: "DNS Management",
    category: "domains",
    description: "Full DNS control with A, AAAA, CNAME, MX, TXT records and more",
    icon: "FileCode",
    examples: [
      "Configure DNS for mysite.com",
      "Add MX records for email",
    ],
    features: ["Fast propagation", "Geo-routing", "Health checks"],
  },
  {
    id: "ssl-certificates",
    name: "SSL Certificates",
    category: "domains",
    description: "Automatic SSL/TLS certificates with Let's Encrypt integration",
    icon: "Lock",
    examples: [
      "Enable HTTPS for my domain",
      "Set up wildcard SSL certificate",
    ],
    features: ["Auto-renewal", "Wildcard support", "Free certificates"],
  },

  // Compute
  {
    id: "containers",
    name: "Containers",
    category: "compute",
    description: "Deploy containerized applications with automatic scaling",
    icon: "Box",
    examples: [
      "Deploy a Docker container with 2 replicas",
      "Run my Node.js app in a container",
    ],
    features: ["Auto-scaling", "Zero-downtime deploys", "Resource limits"],
  },
  {
    id: "kubernetes",
    name: "Managed Kubernetes",
    category: "compute",
    description: "Production-ready Kubernetes clusters with one prompt",
    icon: "Boxes",
    examples: [
      "Create a K8s cluster with 3 nodes",
      "Deploy my app to Kubernetes",
    ],
    features: ["Managed control plane", "Auto-updates", "Multi-AZ"],
  },
  {
    id: "gpu-instances",
    name: "GPU Instances",
    category: "compute",
    description: "High-performance GPU compute for ML and AI workloads",
    icon: "Cpu",
    examples: [
      "Launch a GPU instance for ML training",
      "Run inference on NVIDIA A100",
    ],
    features: ["NVIDIA GPUs", "PyTorch/TensorFlow", "Spot instances"],
  },

  // Serverless
  {
    id: "functions",
    name: "Functions",
    category: "serverless",
    description: "Event-driven serverless functions that scale to zero",
    icon: "Zap",
    examples: [
      "Create a function to process webhooks",
      "Deploy an API endpoint",
    ],
    features: ["Scale to zero", "Multiple runtimes", "Edge execution"],
  },
  {
    id: "cron-jobs",
    name: "Cron Jobs",
    category: "serverless",
    description: "Scheduled tasks and background jobs",
    icon: "Clock",
    examples: [
      "Run a cleanup job every night",
      "Schedule daily report generation",
    ],
    features: ["Cron syntax", "Retry logic", "Monitoring"],
  },

  // Storage
  {
    id: "object-storage",
    name: "Object Storage",
    category: "storage",
    description: "S3-compatible object storage for files and media",
    icon: "HardDrive",
    examples: [
      "Create a bucket for user uploads",
      "Set up S3-compatible storage",
    ],
    features: ["S3-compatible", "CDN integration", "Versioning"],
  },
  {
    id: "block-storage",
    name: "Block Storage",
    category: "storage",
    description: "High-performance SSD volumes for databases and apps",
    icon: "Database",
    examples: [
      "Attach a 100GB SSD volume",
      "Create storage for my database",
    ],
    features: ["SSD/NVMe", "Snapshots", "Encryption"],
  },
  {
    id: "backups",
    name: "Automated Backups",
    category: "storage",
    description: "Scheduled backups with point-in-time recovery",
    icon: "Archive",
    examples: [
      "Enable daily backups for my database",
      "Set up backup retention policy",
    ],
    features: ["Automated", "Point-in-time", "Cross-region"],
  },

  // Databases
  {
    id: "postgresql",
    name: "PostgreSQL",
    category: "databases",
    description: "Fully managed PostgreSQL with high availability",
    icon: "Database",
    examples: [
      "Create a PostgreSQL database",
      "Set up Postgres with read replicas",
    ],
    features: ["High availability", "Read replicas", "Extensions"],
  },
  {
    id: "mysql",
    name: "MySQL",
    category: "databases",
    description: "Managed MySQL databases with automatic failover",
    icon: "Database",
    examples: [
      "Deploy a MySQL database",
      "Migrate my MySQL to cloud",
    ],
    features: ["Auto failover", "Replication", "Backups"],
  },
  {
    id: "vector-db",
    name: "Vector Database",
    category: "databases",
    description: "Vector storage for AI embeddings and semantic search",
    icon: "Brain",
    examples: [
      "Create a vector database for embeddings",
      "Set up semantic search storage",
    ],
    features: ["Similarity search", "AI-optimized", "High performance"],
  },

  // Cache
  {
    id: "redis",
    name: "Redis",
    category: "cache",
    description: "Managed Redis for caching, sessions, and real-time data",
    icon: "Layers",
    examples: [
      "Add Redis cache to my app",
      "Set up session storage with Redis",
    ],
    features: ["Clustering", "Persistence", "Pub/Sub"],
  },

  // Queues
  {
    id: "message-queue",
    name: "Message Queue",
    category: "queues",
    description: "Reliable message queuing for async processing",
    icon: "MessageSquare",
    examples: [
      "Create a queue for background jobs",
      "Set up task processing pipeline",
    ],
    features: ["Guaranteed delivery", "Dead letter", "Retries"],
  },
  {
    id: "pubsub",
    name: "Pub/Sub",
    category: "queues",
    description: "Real-time event streaming and pub/sub messaging",
    icon: "Radio",
    examples: [
      "Set up event streaming",
      "Create pub/sub for real-time updates",
    ],
    features: ["Real-time", "Fan-out", "Filtering"],
  },

  // Networking
  {
    id: "vpc",
    name: "VPC",
    category: "networking",
    description: "Isolated virtual networks for secure infrastructure",
    icon: "Network",
    examples: [
      "Create a private network for my services",
      "Set up VPC with subnets",
    ],
    features: ["Isolation", "Subnets", "Peering"],
  },
  {
    id: "load-balancer",
    name: "Load Balancer",
    category: "networking",
    description: "Distribute traffic across instances with health checks",
    icon: "Share2",
    examples: [
      "Add a load balancer for my API",
      "Set up HTTPS load balancing",
    ],
    features: ["SSL termination", "Health checks", "Sticky sessions"],
  },
  {
    id: "private-link",
    name: "Private Link",
    category: "networking",
    description: "Secure private connections between services",
    icon: "Link",
    examples: [
      "Connect my app to database privately",
      "Set up private service mesh",
    ],
    features: ["Private IPs", "No internet", "Low latency"],
  },

  // CDN & Edge
  {
    id: "cdn",
    name: "CDN",
    category: "cdn",
    description: "Global content delivery for faster load times",
    icon: "Globe2",
    examples: [
      "Enable CDN for my static assets",
      "Set up global caching",
    ],
    features: ["200+ PoPs", "Instant purge", "Analytics"],
  },
  {
    id: "edge-functions",
    name: "Edge Functions",
    category: "cdn",
    description: "Run code at the edge for ultra-low latency",
    icon: "Zap",
    examples: [
      "Deploy an edge function for auth",
      "Run A/B tests at the edge",
    ],
    features: ["<10ms latency", "Global deploy", "V8 isolates"],
  },

  // Security
  {
    id: "iam",
    name: "IAM / RBAC",
    category: "security",
    description: "Fine-grained access control and role management",
    icon: "Users",
    examples: [
      "Set up team access controls",
      "Create read-only role for developers",
    ],
    features: ["RBAC", "SSO/SAML", "Audit logs"],
  },
  {
    id: "secrets",
    name: "Secrets Manager",
    category: "security",
    description: "Secure storage for API keys, passwords, and credentials",
    icon: "Key",
    examples: [
      "Store my API keys securely",
      "Inject secrets into containers",
    ],
    features: ["Encryption", "Rotation", "Versioning"],
  },
  {
    id: "waf",
    name: "WAF & DDoS",
    category: "security",
    description: "Web application firewall and DDoS protection",
    icon: "Shield",
    examples: [
      "Enable WAF for my API",
      "Set up DDoS protection",
    ],
    features: ["OWASP rules", "Rate limiting", "Bot protection"],
  },

  // Observability
  {
    id: "logs",
    name: "Logs",
    category: "observability",
    description: "Centralized logging with search and analytics",
    icon: "FileText",
    examples: [
      "Enable logging for my services",
      "Set up log aggregation",
    ],
    features: ["Real-time", "Search", "Retention"],
  },
  {
    id: "metrics",
    name: "Metrics",
    category: "observability",
    description: "Application and infrastructure metrics with dashboards",
    icon: "BarChart2",
    examples: [
      "Create a metrics dashboard",
      "Monitor my API response times",
    ],
    features: ["Dashboards", "Custom metrics", "Grafana"],
  },
  {
    id: "tracing",
    name: "Distributed Tracing",
    category: "observability",
    description: "End-to-end request tracing across services",
    icon: "GitBranch",
    examples: [
      "Enable distributed tracing",
      "Debug slow API requests",
    ],
    features: ["OpenTelemetry", "Service maps", "Latency"],
  },
  {
    id: "alerting",
    name: "Alerting",
    category: "observability",
    description: "Intelligent alerts with multiple notification channels",
    icon: "Bell",
    examples: [
      "Alert me when error rate spikes",
      "Set up on-call notifications",
    ],
    features: ["Slack/PagerDuty", "Thresholds", "Escalation"],
  },

  // CI/CD
  {
    id: "deploy-pipelines",
    name: "Deploy Pipelines",
    category: "cicd",
    description: "Automated build and deploy pipelines from Git",
    icon: "GitBranch",
    examples: [
      "Deploy from GitHub on push",
      "Set up staging and production",
    ],
    features: ["GitOps", "Preview deploys", "Rollbacks"],
  },
  {
    id: "gitops",
    name: "GitOps",
    category: "cicd",
    description: "Infrastructure as code with Git-based workflows",
    icon: "Git",
    examples: [
      "Enable GitOps for my infrastructure",
      "Sync infra from my repo",
    ],
    features: ["Declarative", "Drift detection", "Auto-sync"],
  },
];

export function getServicesByCategory(category: string): Service[] {
  return services.filter((s) => s.category === category);
}

export function getServiceById(id: string): Service | undefined {
  return services.find((s) => s.id === id);
}
