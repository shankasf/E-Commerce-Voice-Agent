import { KubernetesService } from './kubernetes.service';
import type { UserResponseDto } from '../auth/dto/auth.dto';
declare class ScaleDto {
    replicas: number;
}
declare class UpdateSecretDto {
    data: Record<string, string>;
}
declare class UpdateConfigMapDto {
    data: Record<string, string>;
}
export declare class KubernetesController {
    private readonly kubernetesService;
    constructor(kubernetesService: KubernetesService);
    getClusterInfo(): Promise<{
        totalPods: number;
        runningPods: number;
        failedPods: number;
        totalDeployments: number;
        namespaceCount: number;
    }>;
    listNamespaces(): Promise<import("./kubernetes.service").NamespaceInfo[]>;
    getManagedNamespaces(): {
        namespaces: string[];
    };
    listPods(namespace: string): Promise<import("./kubernetes.service").PodInfo[]>;
    getPod(namespace: string, name: string): Promise<import("./kubernetes.service").PodInfo>;
    restartPod(namespace: string, name: string, user: UserResponseDto): Promise<{
        success: boolean;
        message: string;
        by: string;
    }>;
    getPodLogs(namespace: string, name: string, container?: string, tailLines?: string): Promise<{
        logs: string;
    }>;
    listDeployments(namespace: string): Promise<import("./kubernetes.service").DeploymentInfo[]>;
    getDeployment(namespace: string, name: string): Promise<import("./kubernetes.service").DeploymentInfo>;
    scaleDeployment(namespace: string, name: string, scaleDto: ScaleDto, user: UserResponseDto): Promise<{
        success: boolean;
        message: string;
        deployment: import("./kubernetes.service").DeploymentInfo;
        by: string;
    }>;
    restartDeployment(namespace: string, name: string, user: UserResponseDto): Promise<{
        success: boolean;
        message: string;
        by: string;
    }>;
    listSecrets(namespace: string): Promise<import("./kubernetes.service").SecretInfo[]>;
    getSecret(namespace: string, name: string): Promise<import("./kubernetes.service").SecretInfo>;
    updateSecret(namespace: string, name: string, updateDto: UpdateSecretDto, user: UserResponseDto): Promise<{
        success: boolean;
        message: string;
        secret: import("./kubernetes.service").SecretInfo;
        by: string;
    }>;
    listConfigMaps(namespace: string): Promise<import("./kubernetes.service").ConfigMapInfo[]>;
    getConfigMap(namespace: string, name: string): Promise<import("./kubernetes.service").ConfigMapInfo>;
    updateConfigMap(namespace: string, name: string, updateDto: UpdateConfigMapDto, user: UserResponseDto): Promise<{
        success: boolean;
        message: string;
        configMap: import("./kubernetes.service").ConfigMapInfo;
        by: string;
    }>;
    listEvents(namespace: string): Promise<import("./kubernetes.service").EventInfo[]>;
    getPodMetrics(namespace: string): Promise<import("./kubernetes.service").PodMetrics[]>;
}
export {};
