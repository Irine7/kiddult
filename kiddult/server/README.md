# Location Verification Server

A Node.js server application that performs location verification for vulnerable individuals.

## Features

- Continuous location checks every 30 seconds
- Integration with Nokia API for precise geolocation tracking
- Safe zone (geofence) boundary verification
- Immediate notifications for boundary violations
- Multi-user support with individual safe zones
- Error handling and retry mechanisms
- Comprehensive logging of verification attempts and violations
- Priority-based verification scheduling
- Health monitoring endpoints

## Technical Stack

- **Node.js** with Express for the server
- **MongoDB** for storing user profiles and safe zones
- **Redis** for caching frequent location checks
- **PM2** for process management and clustering
- **Winston** for logging
- **Axios** for API requests
- **Node-schedule** for scheduling verification tasks

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB
- Redis

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on `.env.example` and fill in your configuration values.

### Running the Server

#### Development Mode

```bash
npm run dev
```

#### Production Mode

```bash
npm start
```

#### Using PM2

```bash
pm2 start ecosystem.config.js
```

## API Endpoints

### Users

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `PATCH /api/users/:id/monitoring` - Update user monitoring status
- `PATCH /api/users/:id/priority` - Update user priority level

### Safe Zones

- `GET /api/safe-zones` - Get all safe zones
- `GET /api/safe-zones/user/:userId` - Get safe zones by user ID
- `GET /api/safe-zones/:id` - Get safe zone by ID
- `POST /api/safe-zones` - Create new safe zone
- `PUT /api/safe-zones/:id` - Update safe zone
- `DELETE /api/safe-zones/:id` - Delete safe zone
- `PATCH /api/safe-zones/:id/status` - Update safe zone active status

### Verifications

- `GET /api/verifications` - Get verification history
- `GET /api/verifications/:id` - Get verification by ID
- `GET /api/verifications/user/:userId` - Get verifications by user ID
- `POST /api/verifications/trigger/:userId` - Trigger manual verification
- `GET /api/verifications/violations` - Get boundary violations

### Health Monitoring

- `GET /health` - Get system health status
- `GET /health/mongodb` - Get MongoDB status
- `GET /health/redis` - Get Redis status

## Architecture

### Core Components

1. **Scheduler Service**: Manages the scheduling of location verification tasks based on user priority.
2. **Verification Service**: Handles the core location verification logic, including API calls and boundary checks.
3. **Notification Service**: Manages sending notifications when boundary violations occur.
4. **Database Service**: Handles database connections and operations.
5. **Cache Service**: Manages Redis caching for frequently accessed data.

### Data Flow

1. Scheduler loads active monitoring profiles from the database
2. For each user, a verification job is scheduled based on priority
3. When a job runs, the verification service:
   - Retrieves the user's current location from Nokia API
   - Fetches the user's safe zones from the database (or cache)
   - Checks if the location is within the safe zones
   - If a boundary violation is detected, sends notifications
   - Logs the verification result

### Error Handling

- Exponential backoff for failed API calls
- Automatic retries for transient errors
- Fallback notification mechanisms
- Comprehensive error logging

### Scalability Considerations

- Clustering with PM2 for multi-core utilization
- Redis caching to reduce database load
- Efficient scheduling based on priority levels
- Rate limiting to prevent API abuse

## License

This project is licensed under the MIT License.