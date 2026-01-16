const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;
export function isSafeIdentifier(value) {
    return typeof value === 'string' && SAFE_IDENTIFIER.test(value);
}
export function quoteIdent(value) {
    if (!isSafeIdentifier(value)) {
        throw new Error(`Invalid identifier: ${value}`);
    }
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
}
export function sanitizeString(value, maxLength = 255) {
    if (typeof value !== 'string') {
        return '';
    }
    return value.slice(0, maxLength).trim();
}
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
export function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}
//# sourceMappingURL=validators.js.map