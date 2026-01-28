import pino from 'pino';
const logger = pino({
    level: process.env.LOG_LEVEL || 'info'
});
export class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
export class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 400, 'VALIDATION_ERROR', details);
    }
}
export class NotFoundError extends AppError {
    constructor(message) {
        super(message, 404, 'NOT_FOUND');
    }
}
export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
    }
}
export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
    }
}
export class DatabaseError extends AppError {
    constructor(message, details) {
        super(message, 500, 'DATABASE_ERROR', details);
    }
}
export function errorHandler(err, _req, res, _next) {
    logger.error({ err }, 'Error occurred');
    if (err instanceof AppError) {
        const response = {
            success: false,
            error: {
                code: err.code,
                message: err.message,
                details: err.details
            }
        };
        res.status(err.statusCode).json(response);
        return;
    }
    // PostgreSQL errors
    if ('code' in err && typeof err.code === 'string') {
        const pgError = err;
        const response = {
            success: false,
            error: {
                code: 'DATABASE_ERROR',
                message: String(pgError.message || 'Database error'),
                details: {
                    pgCode: pgError.code,
                    constraint: pgError.constraint,
                    table: pgError.table
                }
            }
        };
        res.status(400).json(response);
        return;
    }
    // Generic error
    const response = {
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: process.env.NODE_ENV === 'production'
                ? 'An unexpected error occurred'
                : err.message
        }
    };
    res.status(500).json(response);
}
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
export { logger };
//# sourceMappingURL=errorHandler.js.map