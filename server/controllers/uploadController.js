const supabase = require('../config/supabaseclient');

exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const file = req.file;
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${fileName}`; // Path inside the bucket

        const { data, error } = await supabase
            .storage
            .from('ticket-attachments')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (error) {
            console.error('Supabase upload error:', error);
            return res.status(500).json({ error: 'Failed to upload file to storage' });
        }

        // Get Public URL
        const { data: publicData } = supabase
            .storage
            .from('ticket-attachments')
            .getPublicUrl(filePath);

        res.status(200).json({
            url: publicData.publicUrl,
            fileName: file.originalname
        });

    } catch (err) {
        console.error('Upload controller error:', err);
        res.status(500).json({ error: 'Server error during upload' });
    }
};
