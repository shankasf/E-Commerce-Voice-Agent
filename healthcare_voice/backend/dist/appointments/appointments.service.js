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
exports.AppointmentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AppointmentsService = class AppointmentsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(practiceId, filters) {
        const where = { practiceId };
        if (filters?.date) {
            where.scheduledDate = new Date(filters.date);
        }
        else if (filters?.startDate || filters?.endDate) {
            where.scheduledDate = {};
            if (filters.startDate) {
                where.scheduledDate.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                where.scheduledDate.lte = new Date(filters.endDate);
            }
        }
        if (filters?.providerId) {
            where.providerId = filters.providerId;
        }
        if (filters?.patientId) {
            where.patientId = filters.patientId;
        }
        if (filters?.status) {
            where.status = filters.status;
        }
        const [appointments, total] = await Promise.all([
            this.prisma.appointment.findMany({
                where,
                skip: filters?.skip || 0,
                take: filters?.take || 50,
                include: {
                    patient: {
                        select: { firstName: true, lastName: true, phonePrimary: true },
                    },
                    provider: {
                        select: { firstName: true, lastName: true, title: true, specialization: true },
                    },
                    service: {
                        select: { name: true, duration: true },
                    },
                },
                orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
            }),
            this.prisma.appointment.count({ where }),
        ]);
        return { appointments, total };
    }
    async findToday(practiceId, providerId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const where = {
            practiceId,
            scheduledDate: today,
        };
        if (providerId) {
            where.providerId = providerId;
        }
        return this.prisma.appointment.findMany({
            where,
            include: {
                patient: {
                    select: { firstName: true, lastName: true, phonePrimary: true },
                },
                provider: {
                    select: { firstName: true, lastName: true, title: true },
                },
                service: {
                    select: { name: true },
                },
            },
            orderBy: { scheduledTime: 'asc' },
        });
    }
    async findOne(appointmentId) {
        const appointment = await this.prisma.appointment.findUnique({
            where: { appointmentId },
            include: {
                patient: true,
                provider: true,
                service: true,
            },
        });
        if (!appointment) {
            throw new common_1.NotFoundException('Appointment not found');
        }
        return appointment;
    }
    async getAvailableSlots(providerId, date, duration = 30) {
        const targetDate = new Date(date);
        const dayOfWeek = targetDate.getDay();
        const schedule = await this.prisma.providerSchedule.findFirst({
            where: {
                providerId,
                dayOfWeek,
                isAvailable: true,
            },
        });
        if (!schedule) {
            return [];
        }
        const timeOff = await this.prisma.providerTimeOff.findFirst({
            where: {
                providerId,
                startDate: { lte: targetDate },
                endDate: { gte: targetDate },
            },
        });
        if (timeOff) {
            return [];
        }
        const existing = await this.prisma.appointment.findMany({
            where: {
                providerId,
                scheduledDate: targetDate,
                status: { notIn: ['cancelled', 'no_show'] },
            },
            select: { scheduledTime: true, endTime: true, duration: true },
        });
        const slots = [];
        const startTime = schedule.startTime instanceof Date ? schedule.startTime : new Date(schedule.startTime);
        const endTime = schedule.endTime instanceof Date ? schedule.endTime : new Date(schedule.endTime);
        const startHour = startTime.getUTCHours();
        const startMin = startTime.getUTCMinutes();
        const endHour = endTime.getUTCHours();
        const endMin = endTime.getUTCMinutes();
        let currentHour = startHour;
        let currentMin = startMin;
        while (currentHour < endHour || (currentHour === endHour && currentMin + duration <= endMin)) {
            const slotStart = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
            const slotEndMin = currentMin + duration;
            const slotEndHour = currentHour + Math.floor(slotEndMin / 60);
            const slotEnd = `${String(slotEndHour).padStart(2, '0')}:${String(slotEndMin % 60).padStart(2, '0')}`;
            const isAvailable = !existing.some((appt) => {
                const apptStartTime = appt.scheduledTime instanceof Date ? appt.scheduledTime : new Date(appt.scheduledTime);
                const apptEndTime = appt.endTime instanceof Date ? appt.endTime : (appt.endTime ? new Date(appt.endTime) : apptStartTime);
                const apptStart = `${String(apptStartTime.getUTCHours()).padStart(2, '0')}:${String(apptStartTime.getUTCMinutes()).padStart(2, '0')}`;
                const apptEnd = `${String(apptEndTime.getUTCHours()).padStart(2, '0')}:${String(apptEndTime.getUTCMinutes()).padStart(2, '0')}`;
                return !(slotEnd <= apptStart || slotStart >= apptEnd);
            });
            if (isAvailable) {
                slots.push({
                    startTime: slotStart,
                    endTime: slotEnd,
                    date,
                });
            }
            currentMin += 30;
            if (currentMin >= 60) {
                currentHour += 1;
                currentMin -= 60;
            }
        }
        return slots;
    }
    async create(data) {
        const appointmentDate = new Date(data.scheduledDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (appointmentDate < today) {
            throw new common_1.ConflictException('Cannot schedule appointments in the past');
        }
        const slots = await this.getAvailableSlots(data.providerId, data.scheduledDate, data.duration || 30);
        const isAvailable = slots.some((s) => s.startTime === data.scheduledTime);
        if (!isAvailable) {
            throw new common_1.ConflictException('Time slot is not available');
        }
        return this.prisma.appointment.create({
            data: {
                ...data,
                scheduledDate: new Date(data.scheduledDate),
            },
        });
    }
    async update(appointmentId, data) {
        if (data.scheduledDate) {
            data.scheduledDate = new Date(data.scheduledDate);
        }
        return this.prisma.appointment.update({
            where: { appointmentId },
            data,
        });
    }
    async cancel(appointmentId, reason) {
        return this.prisma.appointment.update({
            where: { appointmentId },
            data: {
                status: 'cancelled',
                cancelledAt: new Date(),
                cancellationReason: reason,
            },
        });
    }
    async reschedule(appointmentId, newDate, newTime, newProviderId) {
        const targetDate = new Date(newDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (targetDate < today) {
            throw new common_1.ConflictException('Cannot reschedule to a past date');
        }
        const original = await this.findOne(appointmentId);
        await this.prisma.appointment.update({
            where: { appointmentId },
            data: { status: 'rescheduled' },
        });
        const newAppointment = await this.prisma.appointment.create({
            data: {
                practiceId: original.practiceId,
                patientId: original.patientId,
                providerId: newProviderId || original.providerId,
                serviceId: original.serviceId,
                appointmentType: original.appointmentType,
                scheduledDate: new Date(newDate),
                scheduledTime: newTime,
                duration: original.duration,
                chiefComplaint: original.chiefComplaint,
                rescheduledFromId: appointmentId,
                createdVia: 'voice',
            },
        });
        await this.prisma.appointment.update({
            where: { appointmentId },
            data: { rescheduledToId: newAppointment.appointmentId },
        });
        return newAppointment;
    }
    async confirm(appointmentId) {
        return this.prisma.appointment.update({
            where: { appointmentId },
            data: {
                status: 'confirmed',
                confirmationSent: true,
                confirmationSentAt: new Date(),
            },
        });
    }
    async checkIn(appointmentId) {
        return this.prisma.appointment.update({
            where: { appointmentId },
            data: {
                status: 'checked_in',
                checkedInAt: new Date(),
            },
        });
    }
};
exports.AppointmentsService = AppointmentsService;
exports.AppointmentsService = AppointmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AppointmentsService);
//# sourceMappingURL=appointments.service.js.map