import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
export declare class KubernetesService implements OnModuleInit {
    private configService;
    private readonly logger;
    private kc;
    private coreApi;
    private appsApi;
    private metricsApi;
    private managedNamespaces;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    getManagedNamespaces(): string[];
    private calculateAge;
    private validateNamespace;
    listNamespaces(): Promise<NamespaceInfo[]>;
    listPods(namespace: string): Promise<PodInfo[]>;
    getPod(namespace: string, name: string): Promise<PodInfo>;
    restartPod(namespace: string, name: string): Promise<void>;
    getPodLogs(namespace: string, name: string, options?: {
        container?: string;
        tailLines?: number;
        follow?: boolean;
    }): Promise<string>;
    private toPodInfo;
    private getPodStatus;
    listDeployments(namespace: string): Promise<DeploymentInfo[]>;
    getDeployment(namespace: string, name: string): Promise<DeploymentInfo>;
    scaleDeployment(namespace: string, name: string, replicas: number): Promise<DeploymentInfo>;
    restartDeployment(namespace: string, name: string): Promise<void>;
    private toDeploymentInfo;
    listSecrets(namespace: string): Promise<SecretInfo[]>;
    getSecret(namespace: string, name: string): Promise<SecretInfo>;
    updateSecret(namespace: string, name: string, data: Record<string, string>): Promise<SecretInfo>;
    private toSecretInfo;
    listConfigMaps(namespace: string): Promise<ConfigMapInfo[]>;
    getConfigMap(namespace: string, name: string): Promise<ConfigMapInfo>;
    updateConfigMap(namespace: string, name: string, data: Record<string, string>): Promise<ConfigMapInfo>;
    private toConfigMapInfo;
    listEvents(namespace: string): Promise<EventInfo[]>;
    getPodMetrics(namespace: string): Promise<PodMetrics[]>;
    getClusterInfo(): Promise<{
        totalPods: number;
        runningPods: number;
        failedPods: number;
        totalDeployments: number;
        namespaceCount: number;
    }>;
}
