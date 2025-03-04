const redis = require('redis');
const logger = require('../utils/logger');

// Redis configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';

// Create Redis client
const redisClient = redis.createClient({
  url: `redis://${REDIS_HOST}:${REDIS_PORT}`,
  password: REDIS_PASSWORD || undefined
});

// Redis event handlers
redisClient.on('error', (err) => {
  logger.error('Redis error:', err);
});

redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

redisClient.on('reconnecting', () => {
  logger.warn('Redis client reconnecting');
});

redisClient.on('end', () => {
  logger.info('Redis client disconnected');
});

/**
 * Connect to Redis
 */
async function connectRedis() {
  try {
    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

/**
 * Close Redis connection
 */
async function closeRedis() {
  try {
    await redisClient.quit();
    logger.info('Redis connection closed');
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
    throw error;
  }
}

/**
 * Set a value in Redis with expiration
 * @param {string} key - The key to set
 * @param {string|object} value - The value to set
 * @param {number} expireSeconds - Expiration time in seconds
 */
async function setCache(key, value, expireSeconds = 3600) {
  try {
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;
    await redisClient.set(key, stringValue);
    await redisClient.expire(key, expireSeconds);
  } catch (error) {
    logger.error(`Redis setCache error for key ${key}:`, error);
    throw error;
  }
}

/**
 * Get a value from Redis
 * @param {string} key - The key to get
 * @returns {Promise<string|object|null>} - The value or null if not found
 */
async function getCache(key) {
  try {
    const value = await redisClient.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch (e) {
      return value;
    }
  } catch (error) {
    logger.error(`Redis getCache error for key ${key}:`, error);
    throw error;
  }
}

/**
 * Delete a key from Redis
 * @param {string} key - The key to delete
 */
async function deleteCache(key) {
  try {
    await redisClient.del(key);
  } catch (error) {
    logger.error(`Redis deleteCache error for key ${key}:`, error);
    throw error;
  }
}

module.exports = {
  connectRedis,
  closeRedis,
  setCache,
  getCache,
  deleteCache,
  redisClient
};