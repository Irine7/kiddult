const schedule = require('node-schedule');
const logger = require('../utils/logger');
const { performLocationVerification } = require('./verification.service');
const User = require('../models/user.model');
const { getCache, setCache } = require('../config/redis');

// Cache key for active monitoring profiles
const ACTIVE_USERS_CACHE_KEY = 'active_monitoring_users';
const CACHE_TTL = 300; // 5 minutes

// Priority queue configuration
const PRIORITY_INTERVALS = {
  1: 15000,  // High priority: check every 15 seconds
  2: 30000,  // Medium priority: check every 30 seconds
  3: 60000   // Low priority: check every 60 seconds
};

// Store job references for each user
const userJobs = new Map();

/**
 * Load all active monitoring profiles from database
 * @returns {Promise<Array>} Array of active user profiles
 */
async function loadActiveUsers() {
  try {
    // Try to get from cache first
    const cachedUsers = await getCache(ACTIVE_USERS_CACHE_KEY);
    if (cachedUsers) {
      logger.info(`Loaded ${cachedUsers.length} active users from cache`);
      return cachedUsers;
    }
    
    // If not in cache, fetch from database
    const users = await User.find({ monitoringActive: true })
      .select('_id name deviceId priorityLevel')
      .lean();
    
    // Store in cache
    await setCache(ACTIVE_USERS_CACHE_KEY, users, CACHE_TTL);
    
    logger.info(`Loaded ${users.length} active users from database`);
    return users;
  } catch (error) {
    logger.error('Error loading active users:', error);
    return [];
  }
}

/**
 * Schedule location verification for a user
 * @param {Object} user - User object
 */
function scheduleUserVerification(user) {
  // Cancel existing job if any
  if (userJobs.has(user._id.toString())) {
    userJobs.get(user._id.toString()).cancel();
  }
  
  // Determine interval based on priority
  const interval = PRIORITY_INTERVALS[user.priorityLevel] || PRIORITY_INTERVALS[2];
  
  // Create new job
  const job = schedule.scheduleJob(`*/${Math.ceil(interval/1000)} * * * * *`, async () => {
    try {
      await performLocationVerification(user._id);
    } catch (error) {
      logger.error(`Error verifying location for user ${user._id}:`, error);
    }
  });
  
  // Store job reference
  userJobs.set(user._id.toString(), job);
  
  logger.info(`Scheduled verification for user ${user._id} with priority ${user.priorityLevel} (interval: ${interval}ms)`);
}

/**
 * Initialize the scheduler
 */
async function setupScheduler() {
  try {
    // Load active users
    const activeUsers = await loadActiveUsers();
    
    // Schedule verification for each user
    activeUsers.forEach(scheduleUserVerification);
    
    // Schedule periodic refresh of active users list (every 5 minutes)
    schedule.scheduleJob('*/5 * * * *', async () => {
      logger.info('Refreshing active users list');
      const refreshedUsers = await loadActiveUsers();
      refreshedUsers.forEach(scheduleUserVerification);
    });
    
    logger.info('Location verification scheduler initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize scheduler:', error);
    throw error;
  }
}

/**
 * Stop all scheduled jobs
 */
function stopAllJobs() {
  userJobs.forEach((job, userId) => {
    job.cancel();
    logger.info(`Cancelled verification job for user ${userId}`);
  });
  
  userJobs.clear();
  logger.info('All scheduled jobs stopped');
}

module.exports = {
  setupScheduler,
  stopAllJobs,
  scheduleUserVerification,
  loadActiveUsers
};