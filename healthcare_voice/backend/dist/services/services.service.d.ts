import { PrismaService } from '../prisma/prisma.service';
export declare class ServicesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(practiceId: string, category?: string): Promise<({
        category: {
            name: string;
        };
    } & {
        practiceId: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        serviceId: string;
        duration: number;
        categoryId: string | null;
        code: string | null;
        description: string | null;
        price: import("@prisma/client/runtime/library").Decimal | null;
        insuranceBillable: boolean;
        requiresPriorAuth: boolean;
        preparationInstructions: string | null;
        aftercareInstructions: string | null;
    })[]>;
    findOne(serviceId: string): Promise<{
        category: {
            practiceId: string;
            isActive: boolean;
            createdAt: Date;
            name: string;
            categoryId: string;
            description: string | null;
            displayOrder: number;
        };
    } & {
        practiceId: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        serviceId: string;
        duration: number;
        categoryId: string | null;
        code: string | null;
        description: string | null;
        price: import("@prisma/client/runtime/library").Decimal | null;
        insuranceBillable: boolean;
        requiresPriorAuth: boolean;
        preparationInstructions: string | null;
        aftercareInstructions: string | null;
    }>;
    getCategories(practiceId: string): Promise<{
        practiceId: string;
        isActive: boolean;
        createdAt: Date;
        name: string;
        categoryId: string;
        description: string | null;
        displayOrder: number;
    }[]>;
}
