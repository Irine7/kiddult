const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  deviceId: {
    type: String,
    required: true,
    trim: true
  },
  emergencyContacts: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    relationship: {
      type: String,
      trim: true
    }
  }],
  monitoringActive: {
    type: Boolean,
    default: true
  },
  priorityLevel: {
    type: Number,
    enum: [1, 2, 3], // 1: High, 2: Medium, 3: Low
    default: 2
  },
  lastKnownLocation: {
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: null
    },
    timestamp: {
      type: Date,
      default: null
    },
    accuracy: {
      type: Number,
      default: null
    }
  },
  notificationPreferences: {
    email: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: true
    },
    pushNotification: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true,
  versionKey: false
});

// Index for geospatial queries
userSchema.index({ 'lastKnownLocation.coordinates': '2dsphere' });

const User = mongoose.model('User', userSchema);

module.exports = User;