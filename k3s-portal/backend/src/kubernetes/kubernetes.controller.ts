import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { KubernetesService } from './kubernetes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/dto/auth.dto';
import { CurrentUser } from '../auth/decorators/user.decorator';
import type { UserResponseDto } from '../auth/dto/auth.dto';

class ScaleDto {
  replicas!: number;
}

class UpdateSecretDto {
  data!: Record<string, string>;
}

class UpdateConfigMapDto {
  data!: Record<string, string>;
}

@Controller('kubernetes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KubernetesController {
  constructor(private readonly kubernetesService: KubernetesService) {}

  // ============ CLUSTER INFO ============

  @Get('cluster/info')
  async getClusterInfo() {
    return this.kubernetesService.getClusterInfo();
  }

  @Get('namespaces')
  async listNamespaces() {
    return this.kubernetesService.listNamespaces();
  }

  @Get('managed-namespaces')
  getManagedNamespaces() {
    return { namespaces: this.kubernetesService.getManagedNamespaces() };
  }

  // ============ PODS ============

  @Get('namespaces/:namespace/pods')
  async listPods(@Param('namespace') namespace: string) {
    return this.kubernetesService.listPods(namespace);
  }

  @Get('namespaces/:namespace/pods/:name')
  async getPod(
    @Param('namespace') namespace: string,
    @Param('name') name: string,
  ) {
    return this.kubernetesService.getPod(namespace, name);
  }

  @Post('namespaces/:namespace/pods/:name/restart')
  @Roles(UserRole.admin, UserRole.operator)
  async restartPod(
    @Param('namespace') namespace: string,
    @Param('name') name: string,
    @CurrentUser() user: UserResponseDto,
  ) {
    await this.kubernetesService.restartPod(namespace, name);
    return {
      success: true,
      message: `Pod ${name} restarted`,
      by: user.email,
    };
  }

  @Get('namespaces/:namespace/pods/:name/logs')
  async getPodLogs(
    @Param('namespace') namespace: string,
    @Param('name') name: string,
    @Query('container') container?: string,
    @Query('tailLines') tailLines?: string,
  ) {
    const logs = await this.kubernetesService.getPodLogs(namespace, name, {
      container,
      tailLines: tailLines ? parseInt(tailLines, 10) : 500,
    });
    return { logs };
  }

  // ============ DEPLOYMENTS ============

  @Get('namespaces/:namespace/deployments')
  async listDeployments(@Param('namespace') namespace: string) {
    return this.kubernetesService.listDeployments(namespace);
  }

  @Get('namespaces/:namespace/deployments/:name')
  async getDeployment(
    @Param('namespace') namespace: string,
    @Param('name') name: string,
  ) {
    return this.kubernetesService.getDeployment(namespace, name);
  }

  @Post('namespaces/:namespace/deployments/:name/scale')
  @Roles(UserRole.admin, UserRole.operator)
  async scaleDeployment(
    @Param('namespace') namespace: string,
    @Param('name') name: string,
    @Body() scaleDto: ScaleDto,
    @CurrentUser() user: UserResponseDto,
  ) {
    const deployment = await this.kubernetesService.scaleDeployment(
      namespace,
      name,
      scaleDto.replicas,
    );
    return {
      success: true,
      message: `Deployment ${name} scaled to ${scaleDto.replicas} replicas`,
      deployment,
      by: user.email,
    };
  }

  @Post('namespaces/:namespace/deployments/:name/restart')
  @Roles(UserRole.admin, UserRole.operator)
  async restartDeployment(
    @Param('namespace') namespace: string,
    @Param('name') name: string,
    @CurrentUser() user: UserResponseDto,
  ) {
    await this.kubernetesService.restartDeployment(namespace, name);
    return {
      success: true,
      message: `Deployment ${name} restarted`,
      by: user.email,
    };
  }

  // ============ SECRETS ============

  @Get('namespaces/:namespace/secrets')
  @Roles(UserRole.admin)
  async listSecrets(@Param('namespace') namespace: string) {
    return this.kubernetesService.listSecrets(namespace);
  }

  @Get('namespaces/:namespace/secrets/:name')
  @Roles(UserRole.admin)
  async getSecret(
    @Param('namespace') namespace: string,
    @Param('name') name: string,
  ) {
    return this.kubernetesService.getSecret(namespace, name);
  }

  @Put('namespaces/:namespace/secrets/:name')
  @Roles(UserRole.admin)
  async updateSecret(
    @Param('namespace') namespace: string,
    @Param('name') name: string,
    @Body() updateDto: UpdateSecretDto,
    @CurrentUser() user: UserResponseDto,
  ) {
    const secret = await this.kubernetesService.updateSecret(
      namespace,
      name,
      updateDto.data,
    );
    return {
      success: true,
      message: `Secret ${name} updated`,
      secret,
      by: user.email,
    };
  }

  // ============ CONFIGMAPS ============

  @Get('namespaces/:namespace/configmaps')
  async listConfigMaps(@Param('namespace') namespace: string) {
    return this.kubernetesService.listConfigMaps(namespace);
  }

  @Get('namespaces/:namespace/configmaps/:name')
  async getConfigMap(
    @Param('namespace') namespace: string,
    @Param('name') name: string,
  ) {
    return this.kubernetesService.getConfigMap(namespace, name);
  }

  @Put('namespaces/:namespace/configmaps/:name')
  @Roles(UserRole.admin, UserRole.operator)
  async updateConfigMap(
    @Param('namespace') namespace: string,
    @Param('name') name: string,
    @Body() updateDto: UpdateConfigMapDto,
    @CurrentUser() user: UserResponseDto,
  ) {
    const configMap = await this.kubernetesService.updateConfigMap(
      namespace,
      name,
      updateDto.data,
    );
    return {
      success: true,
      message: `ConfigMap ${name} updated`,
      configMap,
      by: user.email,
    };
  }

  // ============ EVENTS ============

  @Get('namespaces/:namespace/events')
  async listEvents(@Param('namespace') namespace: string) {
    return this.kubernetesService.listEvents(namespace);
  }

  // ============ METRICS ============

  @Get('namespaces/:namespace/metrics/pods')
  async getPodMetrics(@Param('namespace') namespace: string) {
    return this.kubernetesService.getPodMetrics(namespace);
  }
}
