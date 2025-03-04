const mongoose = require('mongoose');
const { Schema } = mongoose;

const verificationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  location: {
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    accuracy: {
      type: Number,
      required: true
    }
  },
  safeZoneChecks: [{
    safeZoneId: {
      type: Schema.Types.ObjectId,
      ref: 'SafeZone',
      required: true
    },
    isWithinBoundary: {
      type: Boolean,
      required: true
    },
    distance: {
      type: Number, // distance in meters from boundary if outside
      default: null
    }
  }],
  boundaryViolation: {
    type: Boolean,
    default: false
  },
  notificationSent: {
    type: Boolean,
    default: false
  },
  notificationDetails: {
    timestamp: Date,
    recipients: [String],
    channels: [String], // ['email', 'sms', 'push']
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending'
    },
    error: String
  },
  apiResponse: {
    provider: {
      type: String,
      default: 'Nokia'
    },
    rawResponse: Schema.Types.Mixed,
    responseTime: Number, // in milliseconds
    statusCode: Number
  },
  retryCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['success', 'partial_success', 'failed'],
    default: 'success'
  },
  error: String
}, {
  timestamps: true,
  versionKey: false
});

// Indexes
verificationSchema.index({ userId: 1, timestamp: -1 });
verificationSchema.index({ boundaryViolation: 1 });
verificationSchema.index({ 'location.coordinates': '2dsphere' });

const Verification = mongoose.model('Verification', verificationSchema);

module.exports = Verification;