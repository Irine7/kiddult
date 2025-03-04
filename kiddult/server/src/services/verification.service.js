const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/user.model');
const SafeZone = require('../models/safeZone.model');
const Verification = require('../models/verification.model');
const logger = require('../utils/logger');
const { getCache, setCache } = require('../config/redis');
const { sendNotification } = require('./notification.service');
const { calculateDistance, isPointInPolygon } = require('../utils/geospatial');
const { getLocation } = require('./nokia.service');

// Retry configuration
const MAX_RETRY_ATTEMPTS = parseInt(process.env.RETRY_ATTEMPTS) || 3;
const RETRY_DELAY = parseInt(process.env.RETRY_DELAY) || 5000;

// Cache configuration
const SAFE_ZONE_CACHE_TTL = 3600; // 1 hour

/**
 * Get user's safe zones
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of safe zones
 */
async function getUserSafeZones(userId) {
  const cacheKey = `user_safe_zones_${userId}`;
  
  try {
    // Try to get from cache first
    const cachedZones = await getCache(cacheKey);
    if (cachedZones) {
      return cachedZones;
    }
    
    // If not in cache, fetch from database
    const safeZones = await SafeZone.find({
      userId,
      isActive: true
    }).lean();
    
    // Store in cache
    await setCache(cacheKey, safeZones, SAFE_ZONE_CACHE_TTL);
    
    return safeZones;
  } catch (error) {
    logger.error(`Error fetching safe zones for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Check if location is within safe zones
 * @param {Array} coordinates - [longitude, latitude]
 * @param {Array} safeZones - Array of safe zone objects
 * @returns {Array} Results of boundary checks
 */
function checkSafeZoneBoundaries(coordinates, safeZones) {
  return safeZones.map(zone => {
    let isWithinBoundary = false;
    let distance = null;
    
    if (zone.type === 'circle') {
      // Calculate distance from center
      distance = calculateDistance(
        coordinates,
        zone.center.coordinates
      );
      
      // Check if within radius
      isWithinBoundary = distance <= zone.radius;
      
      // If outside, calculate distance from boundary
      if (!isWithinBoundary) {
        distance = distance - zone.radius;
      }
    } else if (zone.type === 'polygon') {
      // Check if point is inside polygon
      isWithinBoundary = isPointInPolygon(
        coordinates,
        zone.boundaries.coordinates[0]
      );
      
      // If outside, we'd need more complex calculations for distance to polygon edge
      // This is a simplified approach
      if (!isWithinBoundary) {
        distance = 0; // Placeholder for actual distance calculation
      }
    }
    
    return {
      safeZoneId: zone._id,
      isWithinBoundary,
      distance: isWithinBoundary ? 0 : distance
    };
  });
}

/**
 * Perform location verification for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Verification result
 */
async function performLocationVerification(userId) {
  logger.info(`Performing location verification for user ${userId}`);
  
  try {
    // Get user details
    const user = await User.findById(userId);
    if (!user || !user.monitoringActive) {
      logger.warn(`User ${userId} not found or monitoring inactive`);
      return { success: false, error: 'User not found or monitoring inactive' };
    }
    
    // Get user's safe zones
    const safeZones = await getUserSafeZones(userId);
    if (!safeZones.length) {
      logger.warn(`No active safe zones found for user ${userId}`);
      return { success: false, error: 'No active safe zones found' };
    }
    
    // Get user's current location using Nokia API service
    const locationResult = await getLocation(user.deviceId);
    
    // Create verification record
    const verification = new Verification({
      userId,
      timestamp: new Date(),
      location: {
        coordinates: locationResult.coordinates,
        accuracy: locationResult.accuracy
      },
      apiResponse: locationResult.apiResponse,
      retryCount: locationResult.retryCount || 0,
      status: locationResult.success ? 'success' : 'failed',
      error: locationResult.error
    });
    
    // If location retrieval failed, save and return
    if (!locationResult.success) {
      await verification.save();
      return { success: false, error: locationResult.error, verification };
    }
    
    // Check if location is within safe zones
    const safeZoneChecks = checkSafeZoneBoundaries(
      locationResult.coordinates,
      safeZones
    );
    
    verification.safeZoneChecks = safeZoneChecks;
    
    // Check if there's a boundary violation (outside all safe zones)
    const boundaryViolation = !safeZoneChecks.some(check => check.isWithinBoundary);
    verification.boundaryViolation = boundaryViolation;
    
    // Update user's last known location
    user.lastKnownLocation = {
      coordinates: locationResult.coordinates,
      timestamp: new Date(),
      accuracy: locationResult.accuracy
    };
    await user.save();
    
    // If boundary violation, send notification
    if (boundaryViolation) {
      logger.warn(`Boundary violation detected for user ${userId}`);
      
      try {
        const notificationResult = await sendNotification({
          userId,
          userName: user.name,
          location: {
            coordinates: locationResult.coordinates,
            accuracy: locationResult.accuracy
          },
          violationType: 'boundary_exit',
          safeZones: safeZones.map(zone => ({
            id: zone._id,
            name: zone.name
          }))
        });
        
        verification.notificationSent = true;
        verification.notificationDetails = {
          timestamp: new Date(),
          recipients: notificationResult.recipients,
          channels: notificationResult.channels,
          status: notificationResult.success ? 'sent' : 'failed',
          error: notificationResult.error
        };
      } catch (error) {
        logger.error(`Error sending notification for user ${userId}:`, error);
        verification.notificationDetails = {
          timestamp: new Date(),
          status: 'failed',
          error: error.message
        };
      }
    }
    
    // Save verification record
    await verification.save();
    
    return {
      success: true,
      boundaryViolation,
      verification
    };
  } catch (error) {
    logger.error(`Error performing location verification for user ${userId}:`, error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  performLocationVerification,
  getUserSafeZones,
  checkSafeZoneBoundaries
};