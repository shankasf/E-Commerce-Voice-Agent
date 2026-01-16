import { Injectable, OnModuleInit, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as k8s from '@kubernetes/client-node';

export interface PodInfo {
  name: string;
  namespace: string;
  status: string;
  phase: string;
  ready: boolean;
  restarts: number;
  age: string;
  containers: ContainerInfo[];
  nodeName?: string;
  podIP?: string;
  createdAt: Date;
  labels?: Record<string, string>;
}

export interface ContainerInfo {
  name: string;
  image: string;
  ready: boolean;
  restartCount: number;
  state: string;
}

export interface DeploymentInfo {
  name: string;
  namespace: string;
  replicas: number;
  readyReplicas: number;
  availableReplicas: number;
  updatedReplicas: number;
  strategy: string;
  age: string;
  image: string;
  createdAt: Date;
  labels?: Record<string, string>;
}

export interface NamespaceInfo {
  name: string;
  status: string;
  createdAt: Date;
  labels?: Record<string, string>;
}

export interface SecretInfo {
  name: string;
  namespace: string;
  type: string;
  data: Record<string, string>;
  createdAt: Date;
}

export interface ConfigMapInfo {
  name: string;
  namespace: string;
  data: Record<string, string>;
  createdAt: Date;
}

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

export interface EventInfo {
  name: string;
  namespace: string;
  type: string;
  reason: string;
  message: string;
  count: number;
  firstTimestamp?: Date;
  lastTimestamp?: Date;
  involvedObject: {
    kind: string;
    name: string;
  };
}

@Injectable()
export class KubernetesService implements OnModuleInit {
  private readonly logger = new Logger(KubernetesService.name);
  private kc: k8s.KubeConfig;
  private coreApi: k8s.CoreV1Api;
  private appsApi: k8s.AppsV1Api;
  private metricsApi: k8s.Metrics;
  private managedNamespaces: string[];

  constructor(private configService: ConfigService) {
    this.kc = new k8s.KubeConfig();
    this.managedNamespaces = (
      this.configService.get<string>('MANAGED_NAMESPACES') || ''
    )
      .split(',')
      .map((ns: string) => ns.trim())
      .filter(Boolean);
  }

  async onModuleInit() {
    try {
      const kubeconfigPath = this.configService.get<string>('KUBECONFIG_PATH');

      if (kubeconfigPath) {
        this.kc.loadFromFile(kubeconfigPath);
        this.logger.log(`Loaded kubeconfig from: ${kubeconfigPath}`);
      } else {
        // Try in-cluster config first, fall back to default
        try {
          this.kc.loadFromCluster();
          this.logger.log('Loaded in-cluster Kubernetes config');
        } catch {
          this.kc.loadFromDefault();
          this.logger.log('Loaded default Kubernetes config');
        }
      }

      this.coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
      this.appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
      this.metricsApi = new k8s.Metrics(this.kc);

      // Test connection
      await this.coreApi.listNamespace();
      this.logger.log('Successfully connected to Kubernetes cluster');
    } catch (error) {
      this.logger.error('Failed to initialize Kubernetes client', error);
      throw error;
    }
  }

  getManagedNamespaces(): string[] {
    return this.managedNamespaces;
  }

  private calculateAge(createdAt: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) return `${diffDays}d`;
    if (diffHours > 0) return `${diffHours}h`;
    return `${diffMinutes}m`;
  }

  private validateNamespace(namespace: string): void {
    if (this.managedNamespaces.length > 0 && !this.managedNamespaces.includes(namespace)) {
      throw new BadRequestException(`Namespace '${namespace}' is not in the managed list`);
    }
  }

  // ============ NAMESPACES ============

  async listNamespaces(): Promise<NamespaceInfo[]> {
    const response = await this.coreApi.listNamespace();
    const namespaces = response.items
      .filter((ns) => {
        if (this.managedNamespaces.length === 0) return true;
        return this.managedNamespaces.includes(ns.metadata?.name || '');
      })
      .map((ns) => ({
        name: ns.metadata?.name || '',
        status: ns.status?.phase || 'Unknown',
        createdAt: ns.metadata?.creationTimestamp || new Date(),
        labels: ns.metadata?.labels,
      }));

    return namespaces;
  }

  // ============ PODS ============

  async listPods(namespace: string): Promise<PodInfo[]> {
    this.validateNamespace(namespace);

    const response = await this.coreApi.listNamespacedPod({ namespace });
    return response.items.map((pod) => this.toPodInfo(pod));
  }

  async getPod(namespace: string, name: string): Promise<PodInfo> {
    this.validateNamespace(namespace);

    try {
      const response = await this.coreApi.readNamespacedPod({ namespace, name });
      return this.toPodInfo(response);
    } catch (error: unknown) {
      if (error instanceof Error && 'statusCode' in error && (error as { statusCode: number }).statusCode === 404) {
        throw new NotFoundException(`Pod '${name}' not found in namespace '${namespace}'`);
      }
      throw error;
    }
  }

  async restartPod(namespace: string, name: string): Promise<void> {
    this.validateNamespace(namespace);

    try {
      await this.coreApi.deleteNamespacedPod({ namespace, name });
      this.logger.log(`Deleted pod ${name} in namespace ${namespace} for restart`);
    } catch (error: unknown) {
      if (error instanceof Error && 'statusCode' in error && (error as { statusCode: number }).statusCode === 404) {
        throw new NotFoundException(`Pod '${name}' not found in namespace '${namespace}'`);
      }
      throw error;
    }
  }

  async getPodLogs(
    namespace: string,
    name: string,
    options?: { container?: string; tailLines?: number; follow?: boolean },
  ): Promise<string> {
    this.validateNamespace(namespace);

    try {
      const logOptions: {
        namespace: string;
        name: string;
        container?: string;
        tailLines?: number;
        follow?: boolean;
      } = { namespace, name };

      if (options?.container) logOptions.container = options.container;
      if (options?.tailLines) logOptions.tailLines = options.tailLines;
      if (options?.follow) logOptions.follow = options.follow;

      const response = await this.coreApi.readNamespacedPodLog(logOptions);
      return response;
    } catch (error: unknown) {
      if (error instanceof Error && 'statusCode' in error && (error as { statusCode: number }).statusCode === 404) {
        throw new NotFoundException(`Pod '${name}' not found in namespace '${namespace}'`);
      }
      throw error;
    }
  }

  private toPodInfo(pod: k8s.V1Pod): PodInfo {
    const createdAt = pod.metadata?.creationTimestamp || new Date();
    const containerStatuses = pod.status?.containerStatuses || [];

    const containers: ContainerInfo[] = containerStatuses.map((cs) => {
      let state = 'Unknown';
      if (cs.state?.running) state = 'Running';
      else if (cs.state?.waiting) state = cs.state.waiting.reason || 'Waiting';
      else if (cs.state?.terminated) state = cs.state.terminated.reason || 'Terminated';

      return {
        name: cs.name,
        image: cs.image || '',
        ready: cs.ready || false,
        restartCount: cs.restartCount || 0,
        state,
      };
    });

    const totalRestarts = containers.reduce((sum, c) => sum + c.restartCount, 0);
    const allReady = containers.length > 0 && containers.every((c) => c.ready);

    return {
      name: pod.metadata?.name || '',
      namespace: pod.metadata?.namespace || '',
      status: this.getPodStatus(pod),
      phase: pod.status?.phase || 'Unknown',
      ready: allReady,
      restarts: totalRestarts,
      age: this.calculateAge(createdAt),
      containers,
      nodeName: pod.spec?.nodeName,
      podIP: pod.status?.podIP,
      createdAt,
      labels: pod.metadata?.labels,
    };
  }

  private getPodStatus(pod: k8s.V1Pod): string {
    const phase = pod.status?.phase;
    const containerStatuses = pod.status?.containerStatuses || [];

    // Check for container issues
    for (const cs of containerStatuses) {
      if (cs.state?.waiting?.reason) {
        return cs.state.waiting.reason;
      }
      if (cs.state?.terminated?.reason) {
        return cs.state.terminated.reason;
      }
    }

    return phase || 'Unknown';
  }

  // ============ DEPLOYMENTS ============

  async listDeployments(namespace: string): Promise<DeploymentInfo[]> {
    this.validateNamespace(namespace);

    const response = await this.appsApi.listNamespacedDeployment({ namespace });
    return response.items.map((dep) => this.toDeploymentInfo(dep));
  }

  async getDeployment(namespace: string, name: string): Promise<DeploymentInfo> {
    this.validateNamespace(namespace);

    try {
      const response = await this.appsApi.readNamespacedDeployment({ namespace, name });
      return this.toDeploymentInfo(response);
    } catch (error: unknown) {
      if (error instanceof Error && 'statusCode' in error && (error as { statusCode: number }).statusCode === 404) {
        throw new NotFoundException(`Deployment '${name}' not found in namespace '${namespace}'`);
      }
      throw error;
    }
  }

  async scaleDeployment(namespace: string, name: string, replicas: number): Promise<DeploymentInfo> {
    this.validateNamespace(namespace);

    if (replicas < 0) {
      throw new BadRequestException('Replicas must be >= 0');
    }

    try {
      await this.appsApi.patchNamespacedDeploymentScale({
        namespace,
        name,
        body: { spec: { replicas } },
      });

      return this.getDeployment(namespace, name);
    } catch (error: unknown) {
      if (error instanceof Error && 'statusCode' in error && (error as { statusCode: number }).statusCode === 404) {
        throw new NotFoundException(`Deployment '${name}' not found in namespace '${namespace}'`);
      }
      throw error;
    }
  }

  async restartDeployment(namespace: string, name: string): Promise<void> {
    this.validateNamespace(namespace);

    try {
      const patch = {
        spec: {
          template: {
            metadata: {
              annotations: {
                'kubectl.kubernetes.io/restartedAt': new Date().toISOString(),
              },
            },
          },
        },
      };

      await this.appsApi.patchNamespacedDeployment({
        namespace,
        name,
        body: patch,
      });

      this.logger.log(`Restarted deployment ${name} in namespace ${namespace}`);
    } catch (error: unknown) {
      if (error instanceof Error && 'statusCode' in error && (error as { statusCode: number }).statusCode === 404) {
        throw new NotFoundException(`Deployment '${name}' not found in namespace '${namespace}'`);
      }
      throw error;
    }
  }

  private toDeploymentInfo(dep: k8s.V1Deployment): DeploymentInfo {
    const createdAt = dep.metadata?.creationTimestamp || new Date();
    const containers = dep.spec?.template?.spec?.containers || [];
    const image = containers[0]?.image || '';

    return {
      name: dep.metadata?.name || '',
      namespace: dep.metadata?.namespace || '',
      replicas: dep.spec?.replicas || 0,
      readyReplicas: dep.status?.readyReplicas || 0,
      availableReplicas: dep.status?.availableReplicas || 0,
      updatedReplicas: dep.status?.updatedReplicas || 0,
      strategy: dep.spec?.strategy?.type || 'RollingUpdate',
      age: this.calculateAge(createdAt),
      image,
      createdAt,
      labels: dep.metadata?.labels,
    };
  }

  // ============ SECRETS ============

  async listSecrets(namespace: string): Promise<SecretInfo[]> {
    this.validateNamespace(namespace);

    const response = await this.coreApi.listNamespacedSecret({ namespace });
    return response.items
      .filter((s) => !s.type?.startsWith('kubernetes.io/'))
      .map((s) => this.toSecretInfo(s));
  }

  async getSecret(namespace: string, name: string): Promise<SecretInfo> {
    this.validateNamespace(namespace);

    try {
      const response = await this.coreApi.readNamespacedSecret({ namespace, name });
      return this.toSecretInfo(response);
    } catch (error: unknown) {
      if (error instanceof Error && 'statusCode' in error && (error as { statusCode: number }).statusCode === 404) {
        throw new NotFoundException(`Secret '${name}' not found in namespace '${namespace}'`);
      }
      throw error;
    }
  }

  async updateSecret(
    namespace: string,
    name: string,
    data: Record<string, string>,
  ): Promise<SecretInfo> {
    this.validateNamespace(namespace);

    try {
      // Encode values to base64
      const encodedData: Record<string, string> = {};
      for (const [key, value] of Object.entries(data)) {
        encodedData[key] = Buffer.from(value).toString('base64');
      }

      await this.coreApi.patchNamespacedSecret({
        namespace,
        name,
        body: { data: encodedData },
      });

      return this.getSecret(namespace, name);
    } catch (error: unknown) {
      if (error instanceof Error && 'statusCode' in error && (error as { statusCode: number }).statusCode === 404) {
        throw new NotFoundException(`Secret '${name}' not found in namespace '${namespace}'`);
      }
      throw error;
    }
  }

  private toSecretInfo(secret: k8s.V1Secret): SecretInfo {
    const data: Record<string, string> = {};
    if (secret.data) {
      for (const [key, value] of Object.entries(secret.data)) {
        data[key] = Buffer.from(value, 'base64').toString('utf-8');
      }
    }

    return {
      name: secret.metadata?.name || '',
      namespace: secret.metadata?.namespace || '',
      type: secret.type || 'Opaque',
      data,
      createdAt: secret.metadata?.creationTimestamp || new Date(),
    };
  }

  // ============ CONFIGMAPS ============

  async listConfigMaps(namespace: string): Promise<ConfigMapInfo[]> {
    this.validateNamespace(namespace);

    const response = await this.coreApi.listNamespacedConfigMap({ namespace });
    return response.items.map((cm) => this.toConfigMapInfo(cm));
  }

  async getConfigMap(namespace: string, name: string): Promise<ConfigMapInfo> {
    this.validateNamespace(namespace);

    try {
      const response = await this.coreApi.readNamespacedConfigMap({ namespace, name });
      return this.toConfigMapInfo(response);
    } catch (error: unknown) {
      if (error instanceof Error && 'statusCode' in error && (error as { statusCode: number }).statusCode === 404) {
        throw new NotFoundException(`ConfigMap '${name}' not found in namespace '${namespace}'`);
      }
      throw error;
    }
  }

  async updateConfigMap(
    namespace: string,
    name: string,
    data: Record<string, string>,
  ): Promise<ConfigMapInfo> {
    this.validateNamespace(namespace);

    try {
      await this.coreApi.patchNamespacedConfigMap({
        namespace,
        name,
        body: { data },
      });

      return this.getConfigMap(namespace, name);
    } catch (error: unknown) {
      if (error instanceof Error && 'statusCode' in error && (error as { statusCode: number }).statusCode === 404) {
        throw new NotFoundException(`ConfigMap '${name}' not found in namespace '${namespace}'`);
      }
      throw error;
    }
  }

  private toConfigMapInfo(cm: k8s.V1ConfigMap): ConfigMapInfo {
    return {
      name: cm.metadata?.name || '',
      namespace: cm.metadata?.namespace || '',
      data: cm.data || {},
      createdAt: cm.metadata?.creationTimestamp || new Date(),
    };
  }

  // ============ EVENTS ============

  async listEvents(namespace: string): Promise<EventInfo[]> {
    this.validateNamespace(namespace);

    const response = await this.coreApi.listNamespacedEvent({ namespace });
    return response.items
      .sort((a, b) => {
        const timeA = a.lastTimestamp?.getTime() || 0;
        const timeB = b.lastTimestamp?.getTime() || 0;
        return timeB - timeA;
      })
      .slice(0, 100)
      .map((event) => ({
        name: event.metadata?.name || '',
        namespace: event.metadata?.namespace || '',
        type: event.type || 'Normal',
        reason: event.reason || '',
        message: event.message || '',
        count: event.count || 1,
        firstTimestamp: event.firstTimestamp,
        lastTimestamp: event.lastTimestamp,
        involvedObject: {
          kind: event.involvedObject?.kind || '',
          name: event.involvedObject?.name || '',
        },
      }));
  }

  // ============ METRICS ============

  async getPodMetrics(namespace: string): Promise<PodMetrics[]> {
    this.validateNamespace(namespace);

    try {
      const response = await this.metricsApi.getPodMetrics(namespace);
      return response.items.map((item) => ({
        name: item.metadata?.name || '',
        namespace: item.metadata?.namespace || '',
        containers: (item.containers || []).map((c) => ({
          name: c.name,
          cpu: c.usage?.cpu || '0',
          memory: c.usage?.memory || '0',
        })),
      }));
    } catch {
      this.logger.warn(`Failed to get pod metrics for namespace ${namespace}`);
      return [];
    }
  }

  // ============ CLUSTER INFO ============

  async getClusterInfo(): Promise<{
    totalPods: number;
    runningPods: number;
    failedPods: number;
    totalDeployments: number;
    namespaceCount: number;
  }> {
    const namespaces = await this.listNamespaces();
    let totalPods = 0;
    let runningPods = 0;
    let failedPods = 0;
    let totalDeployments = 0;

    for (const ns of namespaces) {
      const pods = await this.listPods(ns.name);
      totalPods += pods.length;
      runningPods += pods.filter((p) => p.phase === 'Running').length;
      failedPods += pods.filter((p) => p.phase === 'Failed').length;

      const deployments = await this.listDeployments(ns.name);
      totalDeployments += deployments.length;
    }

    return {
      totalPods,
      runningPods,
      failedPods,
      totalDeployments,
      namespaceCount: namespaces.length,
    };
  }
}
