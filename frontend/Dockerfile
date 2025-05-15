# Use Node base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app
COPY . .

# Build the frontend (optional for React/Vue etc.)
RUN npm run build

# Start the app
CMD ["npm", "start"]

EXPOSE 3000
