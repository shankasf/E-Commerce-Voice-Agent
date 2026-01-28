import { PrismaService } from '../prisma/prisma.service';
export declare class DashboardService {
    private prisma;
    constructor(prisma: PrismaService);
    getOverview(practiceId: string): Promise<{
        todaysAppointments: number;
        totalPatients: number;
        activeProviders: number;
        recentCalls: number;
        appointmentsByStatus: Record<string, number>;
    }>;
    getTodaysSchedule(practiceId: string): Promise<({
        provider: {
            firstName: string;
            lastName: string;
            title: string;
        };
        patient: {
            firstName: string;
            lastName: string;
            phonePrimary: string;
        };
        service: {
            name: string;
        };
    } & {
        practiceId: string;
        createdAt: Date;
        updatedAt: Date;
        patientId: string;
        notes: string | null;
        providerId: string;
        appointmentId: string;
        serviceId: string | null;
        appointmentType: import(".prisma/client").$Enums.AppointmentType;
        status: import(".prisma/client").$Enums.AppointmentStatus;
        scheduledDate: Date;
        scheduledTime: string;
        endTime: string | null;
        duration: number;
        room: string | null;
        chiefComplaint: string | null;
        internalNotes: string | null;
        isRecurring: boolean;
        recurringPattern: import("@prisma/client/runtime/library").JsonValue | null;
        parentAppointmentId: string | null;
        confirmationSent: boolean;
        confirmationSentAt: Date | null;
        reminderSent: boolean;
        reminderSentAt: Date | null;
        checkedInAt: Date | null;
        startedAt: Date | null;
        completedAt: Date | null;
        cancelledAt: Date | null;
        cancellationReason: string | null;
        rescheduledFromId: string | null;
        rescheduledToId: string | null;
        telehealthLink: string | null;
        createdBy: string | null;
        createdVia: string;
    })[]>;
    getRecentActivity(practiceId: string, limit?: number): Promise<{
        recentAppointments: ({
            patient: {
                firstName: string;
                lastName: string;
            };
        } & {
            practiceId: string;
            createdAt: Date;
            updatedAt: Date;
            patientId: string;
            notes: string | null;
            providerId: string;
            appointmentId: string;
            serviceId: string | null;
            appointmentType: import(".prisma/client").$Enums.AppointmentType;
            status: import(".prisma/client").$Enums.AppointmentStatus;
            scheduledDate: Date;
            scheduledTime: string;
            endTime: string | null;
            duration: number;
            room: string | null;
            chiefComplaint: string | null;
            internalNotes: string | null;
            isRecurring: boolean;
            recurringPattern: import("@prisma/client/runtime/library").JsonValue | null;
            parentAppointmentId: string | null;
            confirmationSent: boolean;
            confirmationSentAt: Date | null;
            reminderSent: boolean;
            reminderSentAt: Date | null;
            checkedInAt: Date | null;
            startedAt: Date | null;
            completedAt: Date | null;
            cancelledAt: Date | null;
            cancellationReason: string | null;
            rescheduledFromId: string | null;
            rescheduledToId: string | null;
            telehealthLink: string | null;
            createdBy: string | null;
            createdVia: string;
        })[];
        recentCalls: ({
            patient: {
                firstName: string;
                lastName: string;
            };
        } & {
            practiceId: string | null;
            createdAt: Date;
            patientId: string | null;
            providerId: string | null;
            appointmentId: string | null;
            status: import(".prisma/client").$Enums.CallStatus;
            startedAt: Date;
            logId: string;
            callSid: string | null;
            sessionId: string | null;
            phoneFrom: string | null;
            phoneTo: string | null;
            direction: import(".prisma/client").$Enums.CallDirection;
            agentType: string | null;
            callReason: string | null;
            durationSeconds: number | null;
            transcript: string | null;
            callSummary: string | null;
            sentiment: string | null;
            resolutionStatus: string | null;
            followUpRequired: boolean;
            followUpNotes: string | null;
            recordingUrl: string | null;
            endedAt: Date | null;
        })[];
    }>;
    getPracticeInfo(practiceId: string): Promise<{
        email: string;
        phone: string;
        name: string;
        addressLine1: string;
        city: string;
        state: string;
        zipCode: string;
        officeHours: import("@prisma/client/runtime/library").JsonValue;
        emergencyPhone: string;
    }>;
}
