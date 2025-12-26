// controllers/deviceController.js
const supabase = require('../config/supabaseclient');

exports.getMyDevices = async (req, res) => {
    const { id } = req.user;
    const showHistory = req.query.history === 'true'; // Check for ?history=true

    try {
        let query = supabase
            .from('contact_devices')
            .select(`
                device_id,
                assigned_at,
                unassigned_at,
                devices (
                    device_id,
                    asset_name,
                    model_id,
                    status,
                    device_models (
                        name,
                        device_manufacturers (name)
                    ) 
                )
            `)
            .eq('contact_id', id);

        // GAP FIX: Only filter out unassigned devices if we are NOT showing history
        if (!showHistory) {
            query = query.is('unassigned_at', null);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Flatten the structure for the frontend
        const devices = data.map(row => ({
            id: row.devices.device_id,
            name: row.devices.asset_name, // Using Asset Name as name
            model: row.devices.device_models ? `${row.devices.device_models.device_manufacturers.name} ${row.devices.device_models.name}` : 'Unknown Model',
            status: row.unassigned_at ? 'RETURNED' : row.devices.status, // Tag returned devices
            status: row.unassigned_at ? 'RETURNED' : row.devices.status, // Tag returned devices
            os: row.devices.os || null, // No more hardcoded Windows 11
            assigned_at: row.assigned_at,
            unassigned_at: row.unassigned_at
        }));

        res.json(devices);

    } catch (err) {
        console.error('Fetch Devices Error:', err);
        res.status(500).json({ error: 'Failed to fetch devices' });
    }
};