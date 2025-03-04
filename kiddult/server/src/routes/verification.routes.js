const express = require('express');
const router = express.Router();
const Verification = require('../models/verification.model');
const { performLocationVerification } = require('../services/verification.service');
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
 * Get verification history
 * GET /api/verifications
 */
router.get('/', async (req, res, next) => {
  try {
    const { userId, limit = 50, page = 1, boundaryViolation } = req.query;
    
    const query = {};
    
    // Filter by user ID if provided
    if (userId) {
      query.userId = userId;
    }
    
    // Filter by boundary violation if provided
    if (boundaryViolation !== undefined) {
      query.boundaryViolation = boundaryViolation === 'true';
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get verifications with pagination
    const verifications = await Verification.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await Verification.countDocuments(query);
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      count: verifications.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: verifications
    });
  } catch (error) {
    logger.error('Error fetching verifications:', error);
    next(error);
  }
});

/**
 * Get verification by ID
 * GET /api/verifications/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const verification = await Verification.findById(req.params.id);
    
    if (!verification) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: 'error',
        message: 'Verification not found'
      });
    }
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: verification
    });
  } catch (error) {
    logger.error(`Error fetching verification ${req.params.id}:`, error);
    next(error);
  }
});

/**
 * Get verifications by user ID
 * GET /api/verifications/user/:userId
 */
router.get('/user/:userId', async (req, res, next) => {
  try {
    const { limit = 50, page = 1, boundaryViolation } = req.query;
    
    const query = { userId: req.params.userId };
    
    // Filter by boundary violation if provided
    if (boundaryViolation !== undefined) {
      query.boundaryViolation = boundaryViolation === 'true';
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get verifications with pagination
    const verifications = await Verification.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await Verification.countDocuments(query);
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      count: verifications.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: verifications
    });
  } catch (error) {
    logger.error(`Error fetching verifications for user ${req.params.userId}:`, error);
    next(error);
  }
});

/**
 * Trigger manual verification for a user
 * POST /api/verifications/trigger/:userId
 */
router.post('/trigger/:userId', async (req, res, next) => {
  try {
    const result = await performLocationVerification(req.params.userId);
    
    if (!result.success) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: result.error
      });
    }
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      boundaryViolation: result.boundaryViolation,
      data: result.verification
    });
  } catch (error) {
    logger.error(`Error triggering verification for user ${req.params.userId}:`, error);
    next(error);
  }
});

/**
 * Get boundary violations
 * GET /api/verifications/violations
 */
router.get('/violations', async (req, res, next) => {
  try {
    const { userId, limit = 50, page = 1, startDate, endDate } = req.query;
    
    const query = { boundaryViolation: true };
    
    // Filter by user ID if provided
    if (userId) {
      query.userId = userId;
    }
    
    // Filter by date range if provided
    if (startDate || endDate) {
      query.timestamp = {};
      
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get violations with pagination
    const violations = await Verification.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await Verification.countDocuments(query);
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      count: violations.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: violations
    });
  } catch (error) {
    logger.error('Error fetching boundary violations:', error);
    next(error);
  }
});

module.exports = router;