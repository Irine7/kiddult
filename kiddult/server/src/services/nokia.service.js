const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Nokia API configuration
const NOKIA_API_BASE_URL = process.env.NOKIA_API_BASE_URL;
const NOKIA_API_KEY = process.env.NOKIA_API_KEY;
const NOKIA_API_SECRET = process.env.NOKIA_API_SECRET;

// Retry configuration
const MAX_RETRY_ATTEMPTS = parseInt(process.env.RETRY_ATTEMPTS) || 3;
const RETRY_DELAY = parseInt(process.env.RETRY_DELAY) || 5000;

/**
 * Get location from Nokia API
 * @param {string} deviceId - Device ID to track
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise<Object>} Location data
 */
async function getLocation(deviceId, retryCount = 0) {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    logger.info(`Requesting location for device ${deviceId} from Nokia API`);
    
    const response = await axios({
      method: 'post',
      url: `${NOKIA_API_BASE_URL}/locate`,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId
      },
      data: {
        deviceId,
        apiKey: NOKIA_API_KEY,
        apiSecret: NOKIA_API_SECRET
      },
      timeout: 10000 // 10 seconds timeout
    });
    
    const responseTime = Date.now() - startTime;
    logger.info(`Nokia API response received in ${responseTime}ms for device ${deviceId}`);
    
    return {
      success: true,
      coordinates: [
        response.data.location.longitude,
        response.data.location.latitude
      ],
      accuracy: response.data.location.accuracy,
      apiResponse: {
        provider: 'Nokia',
        rawResponse: response.data,
        responseTime,
        statusCode: response.status
      }
    };
  } catch (error) {
    logger.error(`Error getting location for device ${deviceId} from Nokia API:`, error);
    
    // Implement exponential backoff for retries
    if (retryCount < MAX_RETRY_ATTEMPTS) {
      const delay = RETRY_DELAY * Math.pow(2, retryCount);
      logger.info(`Retrying Nokia API location request for device ${deviceId} in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return getLocation(deviceId, retryCount + 1);
    }
    
    return {
      success: false,
      error: error.message,
      apiResponse: {
        provider: 'Nokia',
        responseTime: Date.now() - startTime,
        statusCode: error.response?.status || 500,
        rawResponse: error.response?.data || null
      }
    };
  }
}

/**
 * Get device history from Nokia API
 * @param {string} deviceId - Device ID to track
 * @param {Object} options - Query options
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise<Object>} Location history data
 */
async function getDeviceHistory(deviceId, options = {}, retryCount = 0) {
  const requestId = uuidv4();
  const startTime = Date.now();
  const { startTime: start, endTime: end, limit = 100 } = options;
  
  try {
    logger.info(`Requesting location history for device ${deviceId} from Nokia API`);
    
    const response = await axios({
      method: 'get',
      url: `${NOKIA_API_BASE_URL}/history`,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId
      },
      params: {
        deviceId,
        apiKey: NOKIA_API_KEY,
        apiSecret: NOKIA_API_SECRET,
        startTime: start,
        endTime: end,
        limit
      },
      timeout: 15000 // 15 seconds timeout
    });
    
    const responseTime = Date.now() - startTime;
    logger.info(`Nokia API history response received in ${responseTime}ms for device ${deviceId}`);
    
    return {
      success: true,
      history: response.data.locations,
      apiResponse: {
        provider: 'Nokia',
        rawResponse: response.data,
        responseTime,
        statusCode: response.status
      }
    };
  } catch (error) {
    logger.error(`Error getting location history for device ${deviceId} from Nokia API:`, error);
    
    // Implement exponential backoff for retries
    if (retryCount < MAX_RETRY_ATTEMPTS) {
      const delay = RETRY_DELAY * Math.pow(2, retryCount);
      logger.info(`Retrying Nokia API history request for device ${deviceId} in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return getDeviceHistory(deviceId, options, retryCount + 1);
    }
    
    return {
      success: false,
      error: error.message,
      apiResponse: {
        provider: 'Nokia',
        responseTime: Date.now() - startTime,
        statusCode: error.response?.status || 500,
        rawResponse: error.response?.data || null
      }
    };
  }
}

/**
 * Register a device with Nokia API
 * @param {Object} deviceData - Device registration data
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise<Object>} Registration result
 */
async function registerDevice(deviceData, retryCount = 0) {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    logger.info(`Registering device with Nokia API`);
    
    const response = await axios({
      method: 'post',
      url: `${NOKIA_API_BASE_URL}/register`,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId
      },
      data: {
        ...deviceData,
        apiKey: NOKIA_API_KEY,
        apiSecret: NOKIA_API_SECRET
      },
      timeout: 10000 // 10 seconds timeout
    });
    
    const responseTime = Date.now() - startTime;
    logger.info(`Nokia API device registration completed in ${responseTime}ms`);
    
    return {
      success: true,
      deviceId: response.data.deviceId,
      apiResponse: {
        provider: 'Nokia',
        rawResponse: response.data,
        responseTime,
        statusCode: response.status
      }
    };
  } catch (error) {
    logger.error(`Error registering device with Nokia API:`, error);
    
    // Implement exponential backoff for retries
    if (retryCount < MAX_RETRY_ATTEMPTS) {
      const delay = RETRY_DELAY * Math.pow(2, retryCount);
      logger.info(`Retrying Nokia API device registration in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return registerDevice(deviceData, retryCount + 1);
    }
    
    return {
      success: false,
      error: error.message,
      apiResponse: {
        provider: 'Nokia',
        responseTime: Date.now() - startTime,
        statusCode: error.response?.status || 500,
        rawResponse: error.response?.data || null
      }
    };
  }
}

module.exports = {
  getLocation,
  getDeviceHistory,
  registerDevice
};