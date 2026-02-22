import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private dashboardService;
    constructor(dashboardService: DashboardService);
    getOverview(): Promise<{
        todaysAppointments: number;
        totalPatients: number;
        activeProviders: number;
        recentCalls: number;
        appointmentsByStatus: Record<string, number>;
    }>;
    getTodaysSchedule(): Promise<({
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
        createdAt: Date | null;
        updatedAt: Date | null;
        patientId: string;
        notes: string | null;
        providerId: string;
        appointmentId: string;
        serviceId: string | null;
        appointmentType: import(".prisma/client").$Enums.appointment_type;
        status: import(".prisma/client").$Enums.appointment_status;
        scheduledDate: Date;
        scheduledTime: Date;
        endTime: Date | null;
        duration: number;
        room: string | null;
        chiefComplaint: string | null;
        internalNotes: string | null;
        isRecurring: boolean | null;
        recurringPattern: import("@prisma/client/runtime/library").JsonValue | null;
        parentAppointmentId: string | null;
        confirmationSent: boolean | null;
        confirmationSentAt: Date | null;
        reminderSent: boolean | null;
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
        createdVia: string | null;
    })[]>;
    getRecentActivity(limit?: string): Promise<{
        recentAppointments: ({
            patient: {
                firstName: string;
                lastName: string;
            };
        } & {
            practiceId: string;
            createdAt: Date | null;
            updatedAt: Date | null;
            patientId: string;
            notes: string | null;
            providerId: string;
            appointmentId: string;
            serviceId: string | null;
            appointmentType: import(".prisma/client").$Enums.appointment_type;
            status: import(".prisma/client").$Enums.appointment_status;
            scheduledDate: Date;
            scheduledTime: Date;
            endTime: Date | null;
            duration: number;
            room: string | null;
            chiefComplaint: string | null;
            internalNotes: string | null;
            isRecurring: boolean | null;
            recurringPattern: import("@prisma/client/runtime/library").JsonValue | null;
            parentAppointmentId: string | null;
            confirmationSent: boolean | null;
            confirmationSentAt: Date | null;
            reminderSent: boolean | null;
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
            createdVia: string | null;
        })[];
        recentCalls: ({
            patient: {
                firstName: string;
                lastName: string;
            };
        } & {
            practiceId: string | null;
            createdAt: Date | null;
            patientId: string | null;
            providerId: string | null;
            appointmentId: string | null;
            status: import(".prisma/client").$Enums.call_status | null;
            startedAt: Date | null;
            logId: string;
            callSid: string | null;
            sessionId: string | null;
            phoneFrom: string | null;
            phoneTo: string | null;
            direction: import(".prisma/client").$Enums.call_direction;
            agentType: string | null;
            callReason: string | null;
            durationSeconds: number | null;
            transcript: string | null;
            callSummary: string | null;
            sentiment: string | null;
            resolutionStatus: string | null;
            followUpRequired: boolean | null;
            followUpNotes: string | null;
            recordingUrl: string | null;
            endedAt: Date | null;
        })[];
    }>;
    getPracticeInfo(): Promise<{
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
