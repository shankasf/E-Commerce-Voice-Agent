// User & Auth Types
export type UserRole = 'admin' | 'operator' | 'viewer';

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

// Kubernetes Types
export interface Namespace {
  name: string;
  status: string;
  createdAt: string;
  labels?: Record<string, string>;
}

export interface Container {
  name: string;
  image: string;
  ready: boolean;
  restartCount: number;
  state: string;
}

export interface Pod {
  name: string;
  namespace: string;
  status: string;
  phase: string;
  ready: boolean;
  restarts: number;
  age: string;
  containers: Container[];
  nodeName?: string;
  podIP?: string;
  createdAt: string;
  labels?: Record<string, string>;
}

export interface Deployment {
  name: string;
  namespace: string;
  replicas: number;
  readyReplicas: number;
  availableReplicas: number;
  updatedReplicas: number;
  strategy: string;
  image: string;
  age: string;
  createdAt: string;
  labels?: Record<string, string>;
}

export interface Secret {
  name: string;
  namespace: string;
  type: string;
  data: Record<string, string>;
  createdAt: string;
}

export interface ConfigMap {
  name: string;
  namespace: string;
  data: Record<string, string>;
  createdAt: string;
}

export interface Event {
  name: string;
  namespace: string;
  type: string;
  reason: string;
  message: string;
  count: number;
  firstTimestamp?: string;
  lastTimestamp?: string;
  involvedObject: {
    kind: string;
    name: string;
  };
}

export interface Service {
  name: string;
  namespace: string;
  type: string;
  clusterIP?: string;
  externalIP?: string;
  ports: ServicePort[];
  selector: Record<string, string>;
  createdAt: string;
}

export interface ServicePort {
  name?: string;
  port: number;
  targetPort: number;
  nodePort?: number;
  protocol: string;
}

// Metrics Types
export interface PodMetrics {
  name: string;
  namespace: string;
  containers: ContainerMetrics[];
}

export interface ContainerMetrics {
  name: string;
  cpu: string;
  memory: string;
}

// Log Types
export interface LogLine {
  streamId: string;
  namespace: string;
  podName: string;
  line: string;
  timestamp: string;
}

export interface LogFilter {
  namespace?: string;
  pod?: string;
  container?: string;
  searchQuery?: string;
  level?: string;
  tailLines?: number;
  follow?: boolean;
}

// Alert Types
export type AlertType =
  | 'cpu_usage'
  | 'memory_usage'
  | 'pod_restart'
  | 'pod_crash'
  | 'deployment_failed'
  | 'node_not_ready'
  | 'pvc_capacity'
  | 'custom';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertConfiguration {
  id: number;
  name: string;
  namespace?: string;
  alertType: AlertType;
  threshold: number;
  comparison: '>' | '<' | '>=' | '<=' | '==';
  enabled: boolean;
  notifyEmail: boolean;
  notifySlack: boolean;
  createdAt: string;
}

export interface Alert {
  id: number;
  configurationId: number;
  namespace: string;
  resourceName: string;
  message: string;
  value: number;
  severity: AlertSeverity;
  acknowledged: boolean;
  acknowledgedAt?: string;
  resolvedAt?: string;
  createdAt: string;
}

// Audit Log Types
export interface AuditLog {
  id: number;
  userId: number;
  user: { email: string; fullName: string };
  action: string;
  resource: string;
  resourceName: string;
  namespace: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  status: 'success' | 'failed';
  errorMessage?: string;
  createdAt: string;
}

// Dashboard Types
export interface ClusterInfo {
  totalPods: number;
  runningPods: number;
  failedPods: number;
  totalDeployments: number;
  namespaceCount: number;
}

export interface DashboardOverview {
  namespaces: number;
  pods: { total: number; running: number; pending: number; failed: number };
  deployments: { total: number; available: number; progressing: number };
  services: number;
  alerts: { active: number; critical: number; warning: number };
  uptime: { percentage: number; lastIncident?: string };
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// WebSocket Event Types
export interface WsLogLine {
  streamId: string;
  namespace: string;
  podName: string;
  line: string;
  timestamp: string;
}

export interface WsPodStatus {
  namespace: string;
  podName: string;
  status: string;
  phase: string;
  timestamp: string;
}

export interface WsDeploymentUpdate {
  namespace: string;
  deploymentName: string;
  replicas: number;
  readyReplicas: number;
  timestamp: string;
}

export interface WsAlertTriggered {
  namespace: string;
  type: string;
  severity: string;
  message: string;
  timestamp: string;
}
