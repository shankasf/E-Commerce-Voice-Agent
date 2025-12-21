// controllers/deviceController.js
const supabase = require('../config/supabaseclient');

exports.getMyDevices = async (req, res) => {
    try {
        const userId = req.user.id; // Got this from the middleware!

        // Query: "Find all devices assigned to THIS user that are NOT unassigned"
        // We use Supabase nested select to join tables
        const { data, error } = await supabase
            .from('contact_devices')
            .select(`
                assigned_at,
                devices (
                    device_id,
                    asset_name,
                    status,
                    os_version,
                    device_models (
                        name,
                        device_manufacturers (name)
                    ),
                    operating_systems (name)
                )
            `)
            .eq('contact_id', userId)
            .is('unassigned_at', null); // Only active devices

        if (error) throw error;

        // Transform data to a cleaner format for the Frontend
        const formattedDevices = data.map(item => ({
            id: item.devices.device_id,
            name: item.devices.asset_name,
            status: item.devices.status,
            model: `${item.devices.device_models.device_manufacturers.name} ${item.devices.device_models.name}`,
            os: `${item.devices.operating_systems.name} (${item.devices.os_version})`,
            assigned_at: item.assigned_at
        }));

        res.json(formattedDevices);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching devices' });
    }
};