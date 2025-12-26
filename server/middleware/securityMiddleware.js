const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// 1. Helmet: Secure HTTP Headers
// We might need to relax 'Content-Security-Policy' if we serve frontend from the same origin, 
// but since frontend is separate (Vite/CORS), strict defaults are usually fine for the API.
const securityHeaders = helmet();

// 2. Global API Rate Limiter
// Limit repeated requests to public APIs and/or endpoints
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { error: 'Too many requests, please try again later.' }
});

// 3. Stricter Auth Rate Limiter
// Prevent brute-force attacks on login/register
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 login attempts per hour
    message: { error: 'Too many login attempts, please try again after an hour.' }
});

// 4. Upload Rate Limiter
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit file uploads
    message: { error: 'Upload limit exceeded.' }
});

module.exports = {
    securityHeaders,
    globalLimiter,
    authLimiter,
    uploadLimiter
};
