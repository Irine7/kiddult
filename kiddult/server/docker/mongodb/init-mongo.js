// Create application user
db.createUser(
  {
    user: "location_user",
    pwd: "location_password",
    roles: [
      {
        role: "readWrite",
        db: "location-verification"
      }
    ]
  }
);

// Switch to application database
db = db.getSiblingDB('location-verification');

// Create collections with validation
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "email", "phone", "deviceId"],
      properties: {
        name: {
          bsonType: "string",
          description: "must be a string and is required"
        },
        email: {
          bsonType: "string",
          description: "must be a string and is required"
        },
        phone: {
          bsonType: "string",
          description: "must be a string and is required"
        },
        deviceId: {
          bsonType: "string",
          description: "must be a string and is required"
        }
      }
    }
  }
});

db.createCollection("safeZones", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "name", "type"],
      properties: {
        userId: {
          bsonType: "objectId",
          description: "must be an objectId and is required"
        },
        name: {
          bsonType: "string",
          description: "must be a string and is required"
        },
        type: {
          enum: ["circle", "polygon"],
          description: "must be either 'circle' or 'polygon' and is required"
        }
      }
    }
  }
});

db.createCollection("verifications", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "timestamp"],
      properties: {
        userId: {
          bsonType: "objectId",
          description: "must be an objectId and is required"
        },
        timestamp: {
          bsonType: "date",
          description: "must be a date and is required"
        }
      }
    }
  }
});

// Create indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "deviceId": 1 });
db.users.createIndex({ "lastKnownLocation.coordinates": "2dsphere" });

db.safeZones.createIndex({ "userId": 1 });
db.safeZones.createIndex({ "center.coordinates": "2dsphere" });
db.safeZones.createIndex({ "boundaries.coordinates": "2dsphere" });

db.verifications.createIndex({ "userId": 1, "timestamp": -1 });
db.verifications.createIndex({ "boundaryViolation": 1 });
db.verifications.createIndex({ "location.coordinates": "2dsphere" });

// Create sample data for testing
const sampleUser = {
  name: "Test User",
  email: "test@example.com",
  phone: "+1234567890",
  deviceId: "test-device-001",
  emergencyContacts: [
    {
      name: "Emergency Contact",
      phone: "+0987654321",
      email: "emergency@example.com",
      relationship: "Family"
    }
  ],
  monitoringActive: true,
  priorityLevel: 2,
  notificationPreferences: {
    email: true,
    sms: true,
    pushNotification: true
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

db.users.insertOne(sampleUser);

const userId = db.users.findOne({ email: "test@example.com" })._id;

const sampleSafeZone = {
  userId: userId,
  name: "Home",
  description: "Home safe zone",
  type: "circle",
  center: {
    type: "Point",
    coordinates: [-122.084, 37.422]
  },
  radius: 100,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

db.safeZones.insertOne(sampleSafeZone);

print("MongoDB initialization completed successfully");