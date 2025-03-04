const mongoose = require('mongoose');
const { Schema } = mongoose;

const safeZoneSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['circle', 'polygon'],
    required: true
  },
  // For circle type
  center: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: function() {
        return this.type === 'circle';
      }
    }
  },
  radius: {
    type: Number, // in meters
    required: function() {
      return this.type === 'circle';
    },
    min: 50 // minimum 50 meters radius
  },
  // For polygon type
  boundaries: {
    type: {
      type: String,
      enum: ['Polygon'],
      default: 'Polygon'
    },
    coordinates: {
      type: [[[Number]]], // array of arrays of [longitude, latitude] coordinates
      required: function() {
        return this.type === 'polygon';
      }
    }
  },
  schedule: {
    active: {
      type: Boolean,
      default: true
    },
    timeRanges: [{
      days: {
        type: [String],
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      },
      startTime: {
        type: String,
        match: /^([01]\d|2[0-3]):([0-5]\d)$/ // HH:MM format (24-hour)
      },
      endTime: {
        type: String,
        match: /^([01]\d|2[0-3]):([0-5]\d)$/ // HH:MM format (24-hour)
      }
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes for geospatial queries
safeZoneSchema.index({ 'center.coordinates': '2dsphere' });
safeZoneSchema.index({ 'boundaries.coordinates': '2dsphere' });
safeZoneSchema.index({ userId: 1 });

const SafeZone = mongoose.model('SafeZone', safeZoneSchema);

module.exports = SafeZone;