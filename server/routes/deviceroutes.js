// routes/deviceRoutes.js
const express = require('express');
const router = express.Router();
const devicecontroller = require('../controllers/devicecontroller');
const authmiddleware = require('../middleware/authmiddleware');

// GET /api/devices/my-devices
// Notice we put 'authMiddleware' before the controller
router.get('/my-devices', authmiddleware, devicecontroller.getMyDevices);

module.exports = router;