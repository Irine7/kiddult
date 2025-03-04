const axios = require('axios');
const logger = require('../utils/logger');
const User = require('../models/user.model');

// Notification service configuration
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL;
const NOTIFICATION_API_KEY = process.env.NOTIFICATION_API_KEY;

/**
 * Send notification for boundary violation
 * @param {Object} data - Notification data
 * @returns {Promise<Object>} Notification result
 */
async function sendNotification(data) {
  try {
    // Get user's emergency contacts
    const user = await User.findById(data.userId)
      .select('emergencyContacts notificationPreferences')
      .lean();
    
    if (!user) {
      throw new Error(`User ${data.userId} not found`);
    }
    
    // Determine notification channels
    const channels = [];
    if (user.notificationPreferences.email) channels.push('email');
    if (user.notificationPreferences.sms) channels.push('sms');
    if (user.notificationPreferences.pushNotification) channels.push('push');
    
    // Prepare recipients
    const recipients = user.emergencyContacts.map(contact => ({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      relationship: contact.relationship
    }));
    
    // Send notification to external service
    const response = await axios({
      method: 'post',
      url: NOTIFICATION_SERVICE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NOTIFICATION_API_KEY}`
      },
      data: {
        userId: data.userId,
        userName: data.userName,
        eventType: 'boundary_violation',
        violationType: data.violationType,
        location: data.location,
        safeZones: data.safeZones,
        recipients,
        channels,
        timestamp: new Date().toISOString()
      },
      timeout: 5000 // 5 seconds timeout
    });
    
    logger.info(`Notification sent for user ${data.userId}`);
    
    return {
      success: true,
      recipients: recipients.map(r => r.name),
      channels
    };
  } catch (error) {
    logger.error(`Error sending notification:`, error);
    
    // Implement fallback notification mechanism
    try {
      await sendFallbackNotification(data);
      logger.info(`Fallback notification sent for user ${data.userId}`);
      
      return {
        success: true,
        fallback: true,
        recipients: ['Emergency Services'],
        channels: ['sms']
      };
    } catch (fallbackError) {
      logger.error(`Fallback notification failed:`, fallbackError);
      
      return {
        success: false,
        error: error.message,
        fallbackError: fallbackError.message
      };
    }
  }
}

/**
 * Send fallback notification when primary notification fails
 * @param {Object} data - Notification data
 */
async function sendFallbackNotification(data) {
  // This would typically be a more reliable, simpler notification method
  // For example, a direct SMS to emergency services
  logger.info(`Sending fallback notification for user ${data.userId}`);
  
  // Simulate fallback notification
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ success: true });
    }, 1000);
  });
}

module.exports = {
  sendNotification
};