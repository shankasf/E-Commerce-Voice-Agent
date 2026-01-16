"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var KubernetesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KubernetesService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const k8s = __importStar(require("@kubernetes/client-node"));
let KubernetesService = KubernetesService_1 = class KubernetesService {
    configService;
    logger = new common_1.Logger(KubernetesService_1.name);
    kc;
    coreApi;
    appsApi;
    metricsApi;
    managedNamespaces;
    constructor(configService) {
        this.configService = configService;
        this.kc = new k8s.KubeConfig();
        this.managedNamespaces = (this.configService.get('MANAGED_NAMESPACES') || '')
            .split(',')
            .map((ns) => ns.trim())
            .filter(Boolean);
    }
    async onModuleInit() {
        try {
            const kubeconfigPath = this.configService.get('KUBECONFIG_PATH');
            if (kubeconfigPath) {
                this.kc.loadFromFile(kubeconfigPath);
                this.logger.log(`Loaded kubeconfig from: ${kubeconfigPath}`);
            }
            else {
                try {
                    this.kc.loadFromCluster();
                    this.logger.log('Loaded in-cluster Kubernetes config');
                }
                catch {
                    this.kc.loadFromDefault();
                    this.logger.log('Loaded default Kubernetes config');
                }
            }
            this.coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
            this.appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
            this.metricsApi = new k8s.Metrics(this.kc);
            await this.coreApi.listNamespace();
            this.logger.log('Successfully connected to Kubernetes cluster');
        }
        catch (error) {
            this.logger.error('Failed to initialize Kubernetes client', error);
            throw error;
        }
    }
    getManagedNamespaces() {
        return this.managedNamespaces;
    }
    calculateAge(createdAt) {
        const now = new Date();
        const diffMs = now.getTime() - createdAt.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        if (diffDays > 0)
            return `${diffDays}d`;
        if (diffHours > 0)
            return `${diffHours}h`;
        return `${diffMinutes}m`;
    }
    validateNamespace(namespace) {
        if (this.managedNamespaces.length > 0 && !this.managedNamespaces.includes(namespace)) {
            throw new common_1.BadRequestException(`Namespace '${namespace}' is not in the managed list`);
        }
    }
    async listNamespaces() {
        const response = await this.coreApi.listNamespace();
        const namespaces = response.items
            .filter((ns) => {
            if (this.managedNamespaces.length === 0)
                return true;
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
    async listPods(namespace) {
        this.validateNamespace(namespace);
        const response = await this.coreApi.listNamespacedPod({ namespace });
        return response.items.map((pod) => this.toPodInfo(pod));
    }
    async getPod(namespace, name) {
        this.validateNamespace(namespace);
        try {
            const response = await this.coreApi.readNamespacedPod({ namespace, name });
            return this.toPodInfo(response);
        }
        catch (error) {
            if (error instanceof Error && 'statusCode' in error && error.statusCode === 404) {
                throw new common_1.NotFoundException(`Pod '${name}' not found in namespace '${namespace}'`);
            }
            throw error;
        }
    }
    async restartPod(namespace, name) {
        this.validateNamespace(namespace);
        try {
            await this.coreApi.deleteNamespacedPod({ namespace, name });
            this.logger.log(`Deleted pod ${name} in namespace ${namespace} for restart`);
        }
        catch (error) {
            if (error instanceof Error && 'statusCode' in error && error.statusCode === 404) {
                throw new common_1.NotFoundException(`Pod '${name}' not found in namespace '${namespace}'`);
            }
            throw error;
        }
    }
    async getPodLogs(namespace, name, options) {
        this.validateNamespace(namespace);
        try {
            const logOptions = { namespace, name };
            if (options?.container)
                logOptions.container = options.container;
            if (options?.tailLines)
                logOptions.tailLines = options.tailLines;
            if (options?.follow)
                logOptions.follow = options.follow;
            const response = await this.coreApi.readNamespacedPodLog(logOptions);
            return response;
        }
        catch (error) {
            if (error instanceof Error && 'statusCode' in error && error.statusCode === 404) {
                throw new common_1.NotFoundException(`Pod '${name}' not found in namespace '${namespace}'`);
            }
            throw error;
        }
    }
    toPodInfo(pod) {
        const createdAt = pod.metadata?.creationTimestamp || new Date();
        const containerStatuses = pod.status?.containerStatuses || [];
        const containers = containerStatuses.map((cs) => {
            let state = 'Unknown';
            if (cs.state?.running)
                state = 'Running';
            else if (cs.state?.waiting)
                state = cs.state.waiting.reason || 'Waiting';
            else if (cs.state?.terminated)
                state = cs.state.terminated.reason || 'Terminated';
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
    getPodStatus(pod) {
        const phase = pod.status?.phase;
        const containerStatuses = pod.status?.containerStatuses || [];
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
    async listDeployments(namespace) {
        this.validateNamespace(namespace);
        const response = await this.appsApi.listNamespacedDeployment({ namespace });
        return response.items.map((dep) => this.toDeploymentInfo(dep));
    }
    async getDeployment(namespace, name) {
        this.validateNamespace(namespace);
        try {
            const response = await this.appsApi.readNamespacedDeployment({ namespace, name });
            return this.toDeploymentInfo(response);
        }
        catch (error) {
            if (error instanceof Error && 'statusCode' in error && error.statusCode === 404) {
                throw new common_1.NotFoundException(`Deployment '${name}' not found in namespace '${namespace}'`);
            }
            throw error;
        }
    }
    async scaleDeployment(namespace, name, replicas) {
        this.validateNamespace(namespace);
        if (replicas < 0) {
            throw new common_1.BadRequestException('Replicas must be >= 0');
        }
        try {
            await this.appsApi.patchNamespacedDeploymentScale({
                namespace,
                name,
                body: { spec: { replicas } },
            });
            return this.getDeployment(namespace, name);
        }
        catch (error) {
            if (error instanceof Error && 'statusCode' in error && error.statusCode === 404) {
                throw new common_1.NotFoundException(`Deployment '${name}' not found in namespace '${namespace}'`);
            }
            throw error;
        }
    }
    async restartDeployment(namespace, name) {
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
        }
        catch (error) {
            if (error instanceof Error && 'statusCode' in error && error.statusCode === 404) {
                throw new common_1.NotFoundException(`Deployment '${name}' not found in namespace '${namespace}'`);
            }
            throw error;
        }
    }
    toDeploymentInfo(dep) {
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
    async listSecrets(namespace) {
        this.validateNamespace(namespace);
        const response = await this.coreApi.listNamespacedSecret({ namespace });
        return response.items
            .filter((s) => !s.type?.startsWith('kubernetes.io/'))
            .map((s) => this.toSecretInfo(s));
    }
    async getSecret(namespace, name) {
        this.validateNamespace(namespace);
        try {
            const response = await this.coreApi.readNamespacedSecret({ namespace, name });
            return this.toSecretInfo(response);
        }
        catch (error) {
            if (error instanceof Error && 'statusCode' in error && error.statusCode === 404) {
                throw new common_1.NotFoundException(`Secret '${name}' not found in namespace '${namespace}'`);
            }
            throw error;
        }
    }
    async updateSecret(namespace, name, data) {
        this.validateNamespace(namespace);
        try {
            const encodedData = {};
            for (const [key, value] of Object.entries(data)) {
                encodedData[key] = Buffer.from(value).toString('base64');
            }
            await this.coreApi.patchNamespacedSecret({
                namespace,
                name,
                body: { data: encodedData },
            });
            return this.getSecret(namespace, name);
        }
        catch (error) {
            if (error instanceof Error && 'statusCode' in error && error.statusCode === 404) {
                throw new common_1.NotFoundException(`Secret '${name}' not found in namespace '${namespace}'`);
            }
            throw error;
        }
    }
    toSecretInfo(secret) {
        const data = {};
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
    async listConfigMaps(namespace) {
        this.validateNamespace(namespace);
        const response = await this.coreApi.listNamespacedConfigMap({ namespace });
        return response.items.map((cm) => this.toConfigMapInfo(cm));
    }
    async getConfigMap(namespace, name) {
        this.validateNamespace(namespace);
        try {
            const response = await this.coreApi.readNamespacedConfigMap({ namespace, name });
            return this.toConfigMapInfo(response);
        }
        catch (error) {
            if (error instanceof Error && 'statusCode' in error && error.statusCode === 404) {
                throw new common_1.NotFoundException(`ConfigMap '${name}' not found in namespace '${namespace}'`);
            }
            throw error;
        }
    }
    async updateConfigMap(namespace, name, data) {
        this.validateNamespace(namespace);
        try {
            await this.coreApi.patchNamespacedConfigMap({
                namespace,
                name,
                body: { data },
            });
            return this.getConfigMap(namespace, name);
        }
        catch (error) {
            if (error instanceof Error && 'statusCode' in error && error.statusCode === 404) {
                throw new common_1.NotFoundException(`ConfigMap '${name}' not found in namespace '${namespace}'`);
            }
            throw error;
        }
    }
    toConfigMapInfo(cm) {
        return {
            name: cm.metadata?.name || '',
            namespace: cm.metadata?.namespace || '',
            data: cm.data || {},
            createdAt: cm.metadata?.creationTimestamp || new Date(),
        };
    }
    async listEvents(namespace) {
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
    async getPodMetrics(namespace) {
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
        }
        catch {
            this.logger.warn(`Failed to get pod metrics for namespace ${namespace}`);
            return [];
        }
    }
    async getClusterInfo() {
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
};
exports.KubernetesService = KubernetesService;
exports.KubernetesService = KubernetesService = KubernetesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], KubernetesService);
//# sourceMappingURL=kubernetes.service.js.map