const express = require('express');
const router = express.Router();
const nokiaController = require('../controllers/nokiaController');

router.get('/location', nokiaController.getLocation);
router.get('/device-status', nokiaController.getDeviceStatus);

module.exports = router;
