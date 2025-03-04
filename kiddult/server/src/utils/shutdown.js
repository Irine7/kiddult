const logger = require('./logger');
const { closeMongoDB } = require('../config/database');
const { closeRedis } = require('../config/redis');
const { stopAllJobs } = require('../services/scheduler');

/**
 * Perform graceful shutdown
 * @param {Object} app - Express app instance
 */
async function gracefulShutdown(app) {
  logger.info('Received shutdown signal, starting graceful shutdown...');
  
  try {
    // Stop all scheduled jobs
    stopAllJobs();
    logger.info('Stopped all scheduled jobs');
    
    // Close database connections
    await closeMongoDB();
    await closeRedis();
    logger.info('Closed all database connections');
    
    // Exit process
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

module.exports = {
  gracefulShutdown
};