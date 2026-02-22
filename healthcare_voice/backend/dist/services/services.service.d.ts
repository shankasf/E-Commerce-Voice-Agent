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
        isActive: boolean | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        name: string;
        serviceId: string;
        duration: number | null;
        categoryId: string | null;
        code: string | null;
        description: string | null;
        price: import("@prisma/client/runtime/library").Decimal | null;
        insuranceBillable: boolean | null;
        requiresPriorAuth: boolean | null;
        preparationInstructions: string | null;
        aftercareInstructions: string | null;
    })[]>;
    findOne(serviceId: string): Promise<{
        category: {
            practiceId: string;
            isActive: boolean | null;
            createdAt: Date | null;
            name: string;
            categoryId: string;
            description: string | null;
            displayOrder: number | null;
        };
    } & {
        practiceId: string;
        isActive: boolean | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        name: string;
        serviceId: string;
        duration: number | null;
        categoryId: string | null;
        code: string | null;
        description: string | null;
        price: import("@prisma/client/runtime/library").Decimal | null;
        insuranceBillable: boolean | null;
        requiresPriorAuth: boolean | null;
        preparationInstructions: string | null;
        aftercareInstructions: string | null;
    }>;
    getCategories(practiceId: string): Promise<{
        practiceId: string;
        isActive: boolean | null;
        createdAt: Date | null;
        name: string;
        categoryId: string;
        description: string | null;
        displayOrder: number | null;
    }[]>;
}
