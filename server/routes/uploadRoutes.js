const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../controllers/uploadController');
const authmiddleware = require('../middleware/authmiddleware');

// Memory storage with limits and filtering
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
        }
    }
});

// POST /api/upload
router.post('/', authmiddleware, upload.single('file'), uploadController.uploadFile);

module.exports = router;
