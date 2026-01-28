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
var EventsGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const log_stream_service_1 = require("./log-stream.service");
let EventsGateway = EventsGateway_1 = class EventsGateway {
    logStreamService;
    server;
    logger = new common_1.Logger(EventsGateway_1.name);
    clientSubscriptions = new Map();
    constructor(logStreamService) {
        this.logStreamService = logStreamService;
    }
    handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
        this.clientSubscriptions.set(client.id, new Set());
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
        const subscriptions = this.clientSubscriptions.get(client.id);
        if (subscriptions) {
            for (const streamId of subscriptions) {
                this.logStreamService.stopStream(streamId);
            }
        }
        this.clientSubscriptions.delete(client.id);
    }
    async handleSubscribeLogs(client, data) {
        const { namespace, podName, container } = data;
        this.logger.log(`Client ${client.id} subscribing to logs: ${namespace}/${podName}`);
        const streamId = `${client.id}-${namespace}-${podName}-${container || 'default'}`;
        const subscriptions = this.clientSubscriptions.get(client.id);
        if (subscriptions) {
            subscriptions.add(streamId);
        }
        try {
            await this.logStreamService.startStream({
                streamId,
                namespace,
                podName,
                container,
                onLine: (line) => {
                    client.emit('logs:line', {
                        streamId,
                        namespace,
                        podName,
                        line,
                        timestamp: new Date().toISOString(),
                    });
                },
                onError: (error) => {
                    client.emit('logs:error', {
                        streamId,
                        namespace,
                        podName,
                        error,
                    });
                },
                onEnd: () => {
                    client.emit('logs:end', { streamId, namespace, podName });
                },
            });
            return { success: true, streamId };
        }
        catch (error) {
            this.logger.error(`Failed to start log stream: ${error}`);
            return { success: false, error: String(error) };
        }
    }
    handleUnsubscribeLogs(client, data) {
        const { streamId } = data;
        this.logger.log(`Client ${client.id} unsubscribing from logs: ${streamId}`);
        this.logStreamService.stopStream(streamId);
        const subscriptions = this.clientSubscriptions.get(client.id);
        if (subscriptions) {
            subscriptions.delete(streamId);
        }
        return { success: true };
    }
    handleSubscribeNamespace(client, data) {
        const { namespace } = data;
        this.logger.log(`Client ${client.id} subscribing to namespace: ${namespace}`);
        client.join(`namespace:${namespace}`);
        return { success: true };
    }
    handleUnsubscribeNamespace(client, data) {
        const { namespace } = data;
        this.logger.log(`Client ${client.id} unsubscribing from namespace: ${namespace}`);
        client.leave(`namespace:${namespace}`);
        return { success: true };
    }
    broadcastPodStatus(namespace, podName, status, phase) {
        this.server.to(`namespace:${namespace}`).emit('pod:status', {
            namespace,
            podName,
            status,
            phase,
            timestamp: new Date().toISOString(),
        });
    }
    broadcastDeploymentUpdate(namespace, deploymentName, replicas, readyReplicas) {
        this.server.to(`namespace:${namespace}`).emit('deployment:update', {
            namespace,
            deploymentName,
            replicas,
            readyReplicas,
            timestamp: new Date().toISOString(),
        });
    }
    broadcastAlert(namespace, alert) {
        this.server.to(`namespace:${namespace}`).emit('alert:triggered', {
            namespace,
            ...alert,
            timestamp: new Date().toISOString(),
        });
    }
};
exports.EventsGateway = EventsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], EventsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe:logs'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], EventsGateway.prototype, "handleSubscribeLogs", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('unsubscribe:logs'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleUnsubscribeLogs", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe:namespace'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleSubscribeNamespace", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('unsubscribe:namespace'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleUnsubscribeNamespace", null);
exports.EventsGateway = EventsGateway = EventsGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
            credentials: true,
        },
        namespace: '/events',
    }),
    __metadata("design:paramtypes", [log_stream_service_1.LogStreamService])
], EventsGateway);
//# sourceMappingURL=events.gateway.js.map