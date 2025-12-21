// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // 1. Get the token from the header
    const authHeader = req.headers['authorization'];

    // Check if header exists and starts with 'Bearer '
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided, authorization denied' });
    }

    // Extract the actual token string (remove "Bearer " prefix)
    const token = authHeader.split(' ')[1];

    try {
        // 2. Verify the token using your secret
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3. Attach the user info to the request object
        // Now every route after this can use `req.user.id`
        req.user = decoded;

        next(); // Move to the next step (the controller)
    } catch (err) {
        res.status(401).json({ error: 'Token is not valid' });
    }
};