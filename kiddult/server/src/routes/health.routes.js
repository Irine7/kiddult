const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { redisClient } = require('../config/redis');
const logger = require('../utils/logger');
const { StatusCodes } = require('http-status-codes');
const os = require('os');

/**
 * Get system health status
 * GET /health
 */
router.get('/', async (req, res) => {
  try {
    // Check MongoDB connection
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Check Redis connection
    const redisStatus = redisClient.isReady ? 'connected' : 'disconnected';
    
    // Get system metrics
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const systemLoad = os.loadavg();
    const freeMemory = os.freemem();
    const totalMemory = os.totalmem();
    
    // Get process info
    const processInfo = {
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };
    
    // Determine overall status
    const isHealthy = mongoStatus === 'connected' && redisStatus === 'connected';
    
    const healthStatus = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
      services: {
        mongodb: {
          status: mongoStatus,
          details: mongoose.connection.db ? await mongoose.connection.db.stats() : null
        },
        redis: {
          status: redisStatus
        }
      },
      system: {
        memory: {
          free: `${Math.round(freeMemory / 1024 / 1024)} MB`,
          total: `${Math.round(totalMemory / 1024 / 1024)} MB`,
          usage: `${Math.round((totalMemory - freeMemory) / totalMemory * 100)}%`
        },
        cpu: {
          load: systemLoad,
          usage: cpuUsage
        }
      },
      process: {
        ...processInfo,
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
        }
      }
    };
    
    // Log health check
    logger.info(`Health check: ${healthStatus.status}`);
    
    res.status(isHealthy ? StatusCodes.OK : StatusCodes.SERVICE_UNAVAILABLE)
      .json(healthStatus);
  } catch (error) {
    logger.error('Health check failed:', error);
    
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
});

/**
 * Get MongoDB status
 * GET /health/mongodb
 */
router.get('/mongodb', async (req, res) => {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    
    if (!isConnected) {
      return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
        status: 'error',
        message: 'MongoDB disconnected'
      });
    }
    
    const stats = await mongoose.connection.db.stats();
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      message: 'MongoDB connected',
      data: stats
    });
  } catch (error) {
    logger.error('MongoDB health check failed:', error);
    
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'MongoDB health check failed',
      error: error.message
    });
  }
});

/**
 * Get Redis status
 * GET /health/redis
 */
router.get('/redis', async (req, res) => {
  try {
    const isConnected = redisClient.isReady;
    
    if (!isConnected) {
      return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
        status: 'error',
        message: 'Redis disconnected'
      });
    }
    
    // Ping Redis to check responsiveness
    const pingResult = await redisClient.ping();
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      message: 'Redis connected',
      ping: pingResult
    });
  } catch (error) {
    logger.error('Redis health check failed:', error);
    
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Redis health check failed',
      error: error.message
    });
  }
});

module.exports = router;