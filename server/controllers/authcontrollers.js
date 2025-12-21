// controllers/authController.js
const supabase = require('../config/supabaseclient');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Login Function
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Check if user exists
        const { data: user, error } = await supabase
            .from('contacts')
            .select('*')
            .eq('email', email)
            .single(); // Expecting exactly one user

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // 2. Verify Password (User Input vs Database Hash)
        // If user.password_hash is null, they haven't set a password yet
        if (!user.password_hash) {
            return res.status(401).json({ error: 'Account not set up for password login.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // 3. Generate Token (The "Digital Key")
        const payload = {
            id: user.contact_id,
            org_id: user.organization_id,
            name: user.full_name
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

        // 4. Send Success Response
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.contact_id,
                name: user.full_name,
                email: user.email,
                org_id: user.organization_id
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};