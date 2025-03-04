const express = require('express');
const router = express.Router();
const SafeZone = require('../models/safeZone.model');
const { deleteCache } = require('../config/redis');
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
 * Get all safe zones
 * GET /api/safe-zones
 */
router.get('/', async (req, res, next) => {
  try {
    const safeZones = await SafeZone.find()
      .sort({ createdAt: -1 });
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      count: safeZones.length,
      data: safeZones
    });
  } catch (error) {
    logger.error('Error fetching safe zones:', error);
    next(error);
  }
});

/**
 * Get safe zones by user ID
 * GET /api/safe-zones/user/:userId
 */
router.get('/user/:userId', async (req, res, next) => {
  try {
    const safeZones = await SafeZone.find({ userId: req.params.userId })
      .sort({ createdAt: -1 });
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      count: safeZones.length,
      data: safeZones
    });
  } catch (error) {
    logger.error(`Error fetching safe zones for user ${req.params.userId}:`, error);
    next(error);
  }
});

/**
 * Get safe zone by ID
 * GET /api/safe-zones/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const safeZone = await SafeZone.findById(req.params.id);
    
    if (!safeZone) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: 'error',
        message: 'Safe zone not found'
      });
    }
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: safeZone
    });
  } catch (error) {
    logger.error(`Error fetching safe zone ${req.params.id}:`, error);
    next(error);
  }
});

/**
 * Create new safe zone
 * POST /api/safe-zones
 */
router.post('/', async (req, res, next) => {
  try {
    const safeZone = new SafeZone(req.body);
    await safeZone.save();
    
    // Clear cache for this user's safe zones
    await deleteCache(`user_safe_zones_${safeZone.userId}`);
    
    logger.info(`Created new safe zone: ${safeZone._id} for user ${safeZone.userId}`);
    
    res.status(StatusCodes.CREATED).json({
      status: 'success',
      data: safeZone
    });
  } catch (error) {
    logger.error('Error creating safe zone:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: error.message
      });
    }
    
    next(error);
  }
});

/**
 * Update safe zone
 * PUT /api/safe-zones/:id
 */
router.put('/:id', async (req, res, next) => {
  try {
    const safeZone = await SafeZone.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!safeZone) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: 'error',
        message: 'Safe zone not found'
      });
    }
    
    // Clear cache for this user's safe zones
    await deleteCache(`user_safe_zones_${safeZone.userId}`);
    
    logger.info(`Updated safe zone: ${safeZone._id}`);
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: safeZone
    });
  } catch (error) {
    logger.error(`Error updating safe zone ${req.params.id}:`, error);
    
    if (error.name === 'ValidationError') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: error.message
      });
    }
    
    next(error);
  }
});

/**
 * Delete safe zone
 * DELETE /api/safe-zones/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const safeZone = await SafeZone.findById(req.params.id);
    
    if (!safeZone) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: 'error',
        message: 'Safe zone not found'
      });
    }
    
    const userId = safeZone.userId;
    
    await SafeZone.findByIdAndDelete(req.params.id);
    
    // Clear cache for this user's safe zones
    await deleteCache(`user_safe_zones_${userId}`);
    
    logger.info(`Deleted safe zone: ${req.params.id}`);
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      message: 'Safe zone deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting safe zone ${req.params.id}:`, error);
    next(error);
  }
});

/**
 * Update safe zone active status
 * PATCH /api/safe-zones/:id/status
 */
router.patch('/:id/status', async (req, res, next) => {
  try {
    if (typeof req.body.isActive !== 'boolean') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: 'isActive must be a boolean value'
      });
    }
    
    const safeZone = await SafeZone.findByIdAndUpdate(
      req.params.id,
      { isActive: req.body.isActive },
      { new: true }
    );
    
    if (!safeZone) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: 'error',
        message: 'Safe zone not found'
      });
    }
    
    // Clear cache for this user's safe zones
    await deleteCache(`user_safe_zones_${safeZone.userId}`);
    
    logger.info(`Updated active status for safe zone ${safeZone._id} to ${req.body.isActive}`);
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: {
        id: safeZone._id,
        isActive: safeZone.isActive
      }
    });
  } catch (error) {
    logger.error(`Error updating active status for safe zone ${req.params.id}:`, error);
    next(error);
  }
});

module.exports = router;