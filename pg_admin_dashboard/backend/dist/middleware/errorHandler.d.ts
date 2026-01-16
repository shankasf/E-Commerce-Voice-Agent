import type { Request, Response, NextFunction } from 'express';
import pino from 'pino';
declare const logger: pino.Logger<never, boolean>;
export declare class AppError extends Error {
    statusCode: number;
    code: string;
    details?: unknown;
    constructor(message: string, statusCode?: number, code?: string, details?: unknown);
}
export declare class ValidationError extends AppError {
    constructor(message: string, details?: unknown);
}
export declare class NotFoundError extends AppError {
    constructor(message: string);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class DatabaseError extends AppError {
    constructor(message: string, details?: unknown);
}
export declare function errorHandler(err: Error | AppError, _req: Request, res: Response, _next: NextFunction): void;
export declare function asyncHandler<T>(fn: (req: Request, res: Response, next: NextFunction) => Promise<T>): (req: Request, res: Response, next: NextFunction) => void;
export { logger };
//# sourceMappingURL=errorHandler.d.ts.map