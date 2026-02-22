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
exports.CallLogsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CallLogsService = class CallLogsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(practiceId, filters) {
        const where = {};
        if (practiceId) {
            where.practiceId = practiceId;
        }
        if (filters?.patientId) {
            where.patientId = filters.patientId;
        }
        if (filters?.agentType) {
            where.agentType = filters.agentType;
        }
        if (filters?.startDate || filters?.endDate) {
            where.createdAt = {};
            if (filters.startDate) {
                where.createdAt.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                where.createdAt.lte = new Date(filters.endDate);
            }
        }
        const [logs, total] = await Promise.all([
            this.prisma.callLog.findMany({
                where,
                skip: filters?.skip || 0,
                take: filters?.take || 50,
                include: {
                    patient: {
                        select: { firstName: true, lastName: true },
                    },
                    provider: {
                        select: { firstName: true, lastName: true, title: true },
                    },
                    analytics: {
                        select: {
                            sentimentLabel: true,
                            leadClassification: true,
                            intent: true,
                            patientSatisfaction: true,
                            escalationRequired: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.callLog.count({ where }),
        ]);
        return { logs, total };
    }
    async findOne(logId) {
        return this.prisma.callLog.findUnique({
            where: { logId },
            include: {
                patient: true,
                provider: true,
                appointment: {
                    include: {
                        service: { select: { name: true } },
                    },
                },
                agentInteractions: true,
                analytics: true,
            },
        });
    }
    async create(data) {
        return this.prisma.callLog.create({ data });
    }
    async update(logId, data) {
        return this.prisma.callLog.update({
            where: { logId },
            data,
        });
    }
    async getStats(practiceId, days = 7) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const logs = await this.prisma.callLog.findMany({
            where: {
                practiceId,
                createdAt: { gte: startDate },
            },
            select: {
                status: true,
                direction: true,
                durationSeconds: true,
                resolutionStatus: true,
                agentType: true,
                analytics: {
                    select: {
                        sentimentLabel: true,
                        leadClassification: true,
                        patientSatisfaction: true,
                    },
                },
            },
        });
        const totalCalls = logs.length;
        const completedCalls = logs.filter((l) => l.status === 'completed').length;
        const avgDuration = logs.reduce((sum, l) => sum + (l.durationSeconds || 0), 0) / (completedCalls || 1);
        const sentiments = logs.filter(l => l.analytics?.sentimentLabel).map(l => l.analytics.sentimentLabel);
        const sentimentBreakdown = {
            positive: sentiments.filter(s => s === 'positive').length,
            neutral: sentiments.filter(s => s === 'neutral').length,
            negative: sentiments.filter(s => s === 'negative').length,
            mixed: sentiments.filter(s => s === 'mixed').length,
        };
        const leads = logs.filter(l => l.analytics?.leadClassification).map(l => l.analytics.leadClassification);
        const leadBreakdown = {
            hot: leads.filter(l => l === 'hot').length,
            warm: leads.filter(l => l === 'warm').length,
            cold: leads.filter(l => l === 'cold').length,
        };
        const satisfactionScores = logs.filter(l => l.analytics?.patientSatisfaction).map(l => l.analytics.patientSatisfaction);
        const avgSatisfaction = satisfactionScores.length > 0
            ? Math.round((satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length) * 10) / 10
            : 0;
        const voiceCalls = logs.filter(l => l.agentType === 'voice_webrtc').length;
        const chatSessions = logs.filter(l => l.agentType === 'chat').length;
        return {
            totalCalls,
            completedCalls,
            avgDuration: Math.round(avgDuration),
            resolutionRate: totalCalls ? Math.round((completedCalls / totalCalls) * 100) : 0,
            inboundCalls: logs.filter((l) => l.direction === 'inbound').length,
            outboundCalls: logs.filter((l) => l.direction === 'outbound').length,
            voiceCalls,
            chatSessions,
            sentimentBreakdown,
            leadBreakdown,
            avgSatisfaction,
        };
    }
};
exports.CallLogsService = CallLogsService;
exports.CallLogsService = CallLogsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CallLogsService);
//# sourceMappingURL=call-logs.service.js.map