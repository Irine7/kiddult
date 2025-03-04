const express = require('express');
const router = express.Router();
const { getLocation, getDeviceHistory, registerDevice } = require('../services/nokia.service');
const logger = require('../utils/logger');
const { StatusCodes } = require('http-status-codes');
const rateLimit = require('express-rate-limit');

// Rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to all routes
router.use(apiLimiter);

/**
 * Get current location for a device
 * GET /api/nokia/location/:deviceId
 */
router.get('/location/:deviceId', async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    
    logger.info(`API request to get location for device ${deviceId}`);
    
    const result = await getLocation(deviceId);
    
    if (!result.success) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: result.error
      });
    }
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: {
        coordinates: result.coordinates,
        accuracy: result.accuracy,
        timestamp: new Date()
      }
    });
  } catch (error) {
    logger.error(`Error in Nokia location API endpoint:`, error);
    next(error);
  }
});

/**
 * Get location history for a device
 * GET /api/nokia/history/:deviceId
 */
router.get('/history/:deviceId', async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const { startTime, endTime, limit } = req.query;
    
    logger.info(`API request to get location history for device ${deviceId}`);
    
    const result = await getDeviceHistory(deviceId, {
      startTime,
      endTime,
      limit: limit ? parseInt(limit) : undefined
    });
    
    if (!result.success) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: result.error
      });
    }
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      count: result.history.length,
      data: result.history
    });
  } catch (error) {
    logger.error(`Error in Nokia history API endpoint:`, error);
    next(error);
  }
});

/**
 * Register a new device
 * POST /api/nokia/register
 */
router.post('/register', async (req, res, next) => {
  try {
    const deviceData = req.body;
    
    if (!deviceData || !deviceData.deviceType || !deviceData.deviceName) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: 'Missing required device information'
      });
    }
    
    logger.info(`API request to register new device with Nokia API`);
    
    const result = await registerDevice(deviceData);
    
    if (!result.success) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: result.error
      });
    }
    
    res.status(StatusCodes.CREATED).json({
      status: 'success',
      data: {
        deviceId: result.deviceId,
        registeredAt: new Date()
      }
    });
  } catch (error) {
    logger.error(`Error in Nokia register API endpoint:`, error);
    next(error);
  }
});

module.exports = router;