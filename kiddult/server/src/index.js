require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { StatusCodes } = require('http-status-codes');

const logger = require('./utils/logger');
const { connectMongoDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { setupScheduler } = require('./services/scheduler');
const { gracefulShutdown } = require('./utils/shutdown');

// Import routes
const userRoutes = require('./routes/user.routes');
const safeZoneRoutes = require('./routes/safeZone.routes');
const verificationRoutes = require('./routes/verification.routes');
const healthRoutes = require('./routes/health.routes');
const nokiaRoutes = require('./routes/nokia.routes');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/safe-zones', safeZoneRoutes);
app.use('/api/verifications', verificationRoutes);
app.use('/api/nokia', nokiaRoutes);
app.use('/health', healthRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });
  
  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    status: 'error',
    message: 'Resource not found'
  });
});

// Start server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectMongoDB();
    logger.info('Connected to MongoDB');
    
    // Connect to Redis
    await connectRedis();
    logger.info('Connected to Redis');
    
    // Start the server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      
      // Initialize the location verification scheduler
      setupScheduler();
      logger.info('Location verification scheduler initialized');
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown(app));
    process.on('SIGINT', () => gracefulShutdown(app));
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();