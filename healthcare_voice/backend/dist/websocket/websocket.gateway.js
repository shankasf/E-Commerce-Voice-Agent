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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsocketGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
let WebsocketGateway = class WebsocketGateway {
    constructor() {
        this.logger = new common_1.Logger('WebSocketGateway');
    }
    handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }
    handleJoinPractice(client, practiceId) {
        client.join(`practice-${practiceId}`);
        this.logger.log(`Client ${client.id} joined practice ${practiceId}`);
    }
    handleLeavePractice(client, practiceId) {
        client.leave(`practice-${practiceId}`);
    }
    emitToPractice(practiceId, event, data) {
        this.server.to(`practice-${practiceId}`).emit(event, data);
    }
    emitAppointmentUpdate(practiceId, appointment) {
        this.emitToPractice(practiceId, 'appointment-update', appointment);
    }
    emitNewCall(practiceId, callLog) {
        this.emitToPractice(practiceId, 'new-call', callLog);
    }
    emitCallUpdate(practiceId, callLog) {
        this.emitToPractice(practiceId, 'call-update', callLog);
    }
    emitPatientCheckIn(practiceId, appointment) {
        this.emitToPractice(practiceId, 'patient-checkin', appointment);
    }
};
exports.WebsocketGateway = WebsocketGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], WebsocketGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join-practice'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, String]),
    __metadata("design:returntype", void 0)
], WebsocketGateway.prototype, "handleJoinPractice", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave-practice'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, String]),
    __metadata("design:returntype", void 0)
], WebsocketGateway.prototype, "handleLeavePractice", null);
exports.WebsocketGateway = WebsocketGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
    })
], WebsocketGateway);
//# sourceMappingURL=websocket.gateway.js.map