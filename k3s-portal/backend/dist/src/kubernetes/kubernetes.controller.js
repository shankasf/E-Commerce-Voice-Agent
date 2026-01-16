"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KubernetesController = void 0;
const common_1 = require("@nestjs/common");
const kubernetes_service_1 = require("./kubernetes.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const auth_dto_1 = require("../auth/dto/auth.dto");
const user_decorator_1 = require("../auth/decorators/user.decorator");
class ScaleDto {
    replicas;
}
class UpdateSecretDto {
    data;
}
class UpdateConfigMapDto {
    data;
}
let KubernetesController = class KubernetesController {
    kubernetesService;
    constructor(kubernetesService) {
        this.kubernetesService = kubernetesService;
    }
    async getClusterInfo() {
        return this.kubernetesService.getClusterInfo();
    }
    async listNamespaces() {
        return this.kubernetesService.listNamespaces();
    }
    getManagedNamespaces() {
        return { namespaces: this.kubernetesService.getManagedNamespaces() };
    }
    async listPods(namespace) {
        return this.kubernetesService.listPods(namespace);
    }
    async getPod(namespace, name) {
        return this.kubernetesService.getPod(namespace, name);
    }
    async restartPod(namespace, name, user) {
        await this.kubernetesService.restartPod(namespace, name);
        return {
            success: true,
            message: `Pod ${name} restarted`,
            by: user.email,
        };
    }
    async getPodLogs(namespace, name, container, tailLines) {
        const logs = await this.kubernetesService.getPodLogs(namespace, name, {
            container,
            tailLines: tailLines ? parseInt(tailLines, 10) : 500,
        });
        return { logs };
    }
    async listDeployments(namespace) {
        return this.kubernetesService.listDeployments(namespace);
    }
    async getDeployment(namespace, name) {
        return this.kubernetesService.getDeployment(namespace, name);
    }
    async scaleDeployment(namespace, name, scaleDto, user) {
        const deployment = await this.kubernetesService.scaleDeployment(namespace, name, scaleDto.replicas);
        return {
            success: true,
            message: `Deployment ${name} scaled to ${scaleDto.replicas} replicas`,
            deployment,
            by: user.email,
        };
    }
    async restartDeployment(namespace, name, user) {
        await this.kubernetesService.restartDeployment(namespace, name);
        return {
            success: true,
            message: `Deployment ${name} restarted`,
            by: user.email,
        };
    }
    async listSecrets(namespace) {
        return this.kubernetesService.listSecrets(namespace);
    }
    async getSecret(namespace, name) {
        return this.kubernetesService.getSecret(namespace, name);
    }
    async updateSecret(namespace, name, updateDto, user) {
        const secret = await this.kubernetesService.updateSecret(namespace, name, updateDto.data);
        return {
            success: true,
            message: `Secret ${name} updated`,
            secret,
            by: user.email,
        };
    }
    async listConfigMaps(namespace) {
        return this.kubernetesService.listConfigMaps(namespace);
    }
    async getConfigMap(namespace, name) {
        return this.kubernetesService.getConfigMap(namespace, name);
    }
    async updateConfigMap(namespace, name, updateDto, user) {
        const configMap = await this.kubernetesService.updateConfigMap(namespace, name, updateDto.data);
        return {
            success: true,
            message: `ConfigMap ${name} updated`,
            configMap,
            by: user.email,
        };
    }
    async listEvents(namespace) {
        return this.kubernetesService.listEvents(namespace);
    }
    async getPodMetrics(namespace) {
        return this.kubernetesService.getPodMetrics(namespace);
    }
};
exports.KubernetesController = KubernetesController;
__decorate([
    (0, common_1.Get)('cluster/info'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], KubernetesController.prototype, "getClusterInfo", null);
__decorate([
    (0, common_1.Get)('namespaces'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], KubernetesController.prototype, "listNamespaces", null);
__decorate([
    (0, common_1.Get)('managed-namespaces'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], KubernetesController.prototype, "getManagedNamespaces", null);
__decorate([
    (0, common_1.Get)('namespaces/:namespace/pods'),
    __param(0, (0, common_1.Param)('namespace')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KubernetesController.prototype, "listPods", null);
__decorate([
    (0, common_1.Get)('namespaces/:namespace/pods/:name'),
    __param(0, (0, common_1.Param)('namespace')),
    __param(1, (0, common_1.Param)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], KubernetesController.prototype, "getPod", null);
__decorate([
    (0, common_1.Post)('namespaces/:namespace/pods/:name/restart'),
    (0, roles_decorator_1.Roles)(auth_dto_1.UserRole.admin, auth_dto_1.UserRole.operator),
    __param(0, (0, common_1.Param)('namespace')),
    __param(1, (0, common_1.Param)('name')),
    __param(2, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Function]),
    __metadata("design:returntype", Promise)
], KubernetesController.prototype, "restartPod", null);
__decorate([
    (0, common_1.Get)('namespaces/:namespace/pods/:name/logs'),
    __param(0, (0, common_1.Param)('namespace')),
    __param(1, (0, common_1.Param)('name')),
    __param(2, (0, common_1.Query)('container')),
    __param(3, (0, common_1.Query)('tailLines')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], KubernetesController.prototype, "getPodLogs", null);
__decorate([
    (0, common_1.Get)('namespaces/:namespace/deployments'),
    __param(0, (0, common_1.Param)('namespace')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KubernetesController.prototype, "listDeployments", null);
__decorate([
    (0, common_1.Get)('namespaces/:namespace/deployments/:name'),
    __param(0, (0, common_1.Param)('namespace')),
    __param(1, (0, common_1.Param)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], KubernetesController.prototype, "getDeployment", null);
__decorate([
    (0, common_1.Post)('namespaces/:namespace/deployments/:name/scale'),
    (0, roles_decorator_1.Roles)(auth_dto_1.UserRole.admin, auth_dto_1.UserRole.operator),
    __param(0, (0, common_1.Param)('namespace')),
    __param(1, (0, common_1.Param)('name')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, ScaleDto, Function]),
    __metadata("design:returntype", Promise)
], KubernetesController.prototype, "scaleDeployment", null);
__decorate([
    (0, common_1.Post)('namespaces/:namespace/deployments/:name/restart'),
    (0, roles_decorator_1.Roles)(auth_dto_1.UserRole.admin, auth_dto_1.UserRole.operator),
    __param(0, (0, common_1.Param)('namespace')),
    __param(1, (0, common_1.Param)('name')),
    __param(2, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Function]),
    __metadata("design:returntype", Promise)
], KubernetesController.prototype, "restartDeployment", null);
__decorate([
    (0, common_1.Get)('namespaces/:namespace/secrets'),
    (0, roles_decorator_1.Roles)(auth_dto_1.UserRole.admin),
    __param(0, (0, common_1.Param)('namespace')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KubernetesController.prototype, "listSecrets", null);
__decorate([
    (0, common_1.Get)('namespaces/:namespace/secrets/:name'),
    (0, roles_decorator_1.Roles)(auth_dto_1.UserRole.admin),
    __param(0, (0, common_1.Param)('namespace')),
    __param(1, (0, common_1.Param)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], KubernetesController.prototype, "getSecret", null);
__decorate([
    (0, common_1.Put)('namespaces/:namespace/secrets/:name'),
    (0, roles_decorator_1.Roles)(auth_dto_1.UserRole.admin),
    __param(0, (0, common_1.Param)('namespace')),
    __param(1, (0, common_1.Param)('name')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, UpdateSecretDto, Function]),
    __metadata("design:returntype", Promise)
], KubernetesController.prototype, "updateSecret", null);
__decorate([
    (0, common_1.Get)('namespaces/:namespace/configmaps'),
    __param(0, (0, common_1.Param)('namespace')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KubernetesController.prototype, "listConfigMaps", null);
__decorate([
    (0, common_1.Get)('namespaces/:namespace/configmaps/:name'),
    __param(0, (0, common_1.Param)('namespace')),
    __param(1, (0, common_1.Param)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], KubernetesController.prototype, "getConfigMap", null);
__decorate([
    (0, common_1.Put)('namespaces/:namespace/configmaps/:name'),
    (0, roles_decorator_1.Roles)(auth_dto_1.UserRole.admin, auth_dto_1.UserRole.operator),
    __param(0, (0, common_1.Param)('namespace')),
    __param(1, (0, common_1.Param)('name')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, UpdateConfigMapDto, Function]),
    __metadata("design:returntype", Promise)
], KubernetesController.prototype, "updateConfigMap", null);
__decorate([
    (0, common_1.Get)('namespaces/:namespace/events'),
    __param(0, (0, common_1.Param)('namespace')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KubernetesController.prototype, "listEvents", null);
__decorate([
    (0, common_1.Get)('namespaces/:namespace/metrics/pods'),
    __param(0, (0, common_1.Param)('namespace')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KubernetesController.prototype, "getPodMetrics", null);
exports.KubernetesController = KubernetesController = __decorate([
    (0, common_1.Controller)('kubernetes'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [kubernetes_service_1.KubernetesService])
], KubernetesController);
//# sourceMappingURL=kubernetes.controller.js.map