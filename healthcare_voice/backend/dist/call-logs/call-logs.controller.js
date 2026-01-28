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
exports.CallLogsController = void 0;
const common_1 = require("@nestjs/common");
const call_logs_service_1 = require("./call-logs.service");
const DEFAULT_PRACTICE_ID = process.env.DEFAULT_PRACTICE_ID || '00000000-0000-0000-0000-000000000001';
let CallLogsController = class CallLogsController {
    constructor(callLogsService) {
        this.callLogsService = callLogsService;
    }
    async findAll(patientId, startDate, endDate, skip, take) {
        return this.callLogsService.findAll(DEFAULT_PRACTICE_ID, {
            patientId,
            startDate,
            endDate,
            skip: skip ? parseInt(skip) : undefined,
            take: take ? parseInt(take) : undefined,
        });
    }
    async getStats(days) {
        return this.callLogsService.getStats(DEFAULT_PRACTICE_ID, days ? parseInt(days) : 7);
    }
    async findOne(id) {
        return this.callLogsService.findOne(id);
    }
    async create(data) {
        return this.callLogsService.create({
            ...data,
            practiceId: DEFAULT_PRACTICE_ID,
        });
    }
    async update(id, data) {
        return this.callLogsService.update(id, data);
    }
};
exports.CallLogsController = CallLogsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('patientId')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __param(3, (0, common_1.Query)('skip')),
    __param(4, (0, common_1.Query)('take')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], CallLogsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CallLogsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CallLogsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CallLogsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CallLogsController.prototype, "update", null);
exports.CallLogsController = CallLogsController = __decorate([
    (0, common_1.Controller)('call-logs'),
    __metadata("design:paramtypes", [call_logs_service_1.CallLogsService])
], CallLogsController);
//# sourceMappingURL=call-logs.controller.js.map