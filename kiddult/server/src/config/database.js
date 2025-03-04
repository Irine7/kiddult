const mongoose = require('mongoose');
const logger = require('../utils/logger');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/location-verification';

// MongoDB connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

/**
 * Connect to MongoDB
 */
async function connectMongoDB() {
  try {
    await mongoose.connect(MONGODB_URI, options);
    
    // Log successful connection
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connection established');
    });
    
    // Log connection errors
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });
    
    // Log disconnection
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB connection disconnected');
    });
    
    return mongoose.connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Close MongoDB connection
 */
async function closeMongoDB() {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
    throw error;
  }
}

module.exports = {
  connectMongoDB,
  closeMongoDB,
  connection: mongoose.connection
};