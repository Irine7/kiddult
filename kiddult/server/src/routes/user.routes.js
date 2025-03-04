const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const logger = require('../utils/logger');
const { StatusCodes } = require('http-status-codes');
const rateLimit = require('express-rate-limit');

// Rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.'
  }
});

// Apply rate limiting to all routes
router.use(apiLimiter);

/**
 * Get all users
 * GET /api/users
 */
router.get('/', async (req, res, next) => {
  try {
    const users = await User.find()
      .select('-__v')
      .sort({ createdAt: -1 });
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      count: users.length,
      data: users
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    next(error);
  }
});

/**
 * Get user by ID
 * GET /api/users/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: user
    });
  } catch (error) {
    logger.error(`Error fetching user ${req.params.id}:`, error);
    next(error);
  }
});

/**
 * Create new user
 * POST /api/users
 */
router.post('/', async (req, res, next) => {
  try {
    const user = new User(req.body);
    await user.save();
    
    logger.info(`Created new user: ${user._id}`);
    
    res.status(StatusCodes.CREATED).json({
      status: 'success',
      data: user
    });
  } catch (error) {
    logger.error('Error creating user:', error);
    
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
 * Update user
 * PUT /api/users/:id
 */
router.put('/:id', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    logger.info(`Updated user: ${user._id}`);
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: user
    });
  } catch (error) {
    logger.error(`Error updating user ${req.params.id}:`, error);
    
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
 * Delete user
 * DELETE /api/users/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    logger.info(`Deleted user: ${req.params.id}`);
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting user ${req.params.id}:`, error);
    next(error);
  }
});

/**
 * Update user monitoring status
 * PATCH /api/users/:id/monitoring
 */
router.patch('/:id/monitoring', async (req, res, next) => {
  try {
    if (typeof req.body.monitoringActive !== 'boolean') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: 'monitoringActive must be a boolean value'
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { monitoringActive: req.body.monitoringActive },
      { new: true }
    );
    
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    logger.info(`Updated monitoring status for user ${user._id} to ${req.body.monitoringActive}`);
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: {
        id: user._id,
        monitoringActive: user.monitoringActive
      }
    });
  } catch (error) {
    logger.error(`Error updating monitoring status for user ${req.params.id}:`, error);
    next(error);
  }
});

/**
 * Update user priority level
 * PATCH /api/users/:id/priority
 */
router.patch('/:id/priority', async (req, res, next) => {
  try {
    if (![1, 2, 3].includes(req.body.priorityLevel)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: 'priorityLevel must be 1, 2, or 3'
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { priorityLevel: req.body.priorityLevel },
      { new: true }
    );
    
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    logger.info(`Updated priority level for user ${user._id} to ${req.body.priorityLevel}`);
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: {
        id: user._id,
        priorityLevel: user.priorityLevel
      }
    });
  } catch (error) {
    logger.error(`Error updating priority level for user ${req.params.id}:`, error);
    next(error);
  }
});

module.exports = router;