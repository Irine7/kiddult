FROM node:18-alpine

# Create app directory
WORKDIR /home/node/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

# Create log directories
RUN mkdir -p logs/pm2

# Set user to node
USER node

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "src/index.js"]