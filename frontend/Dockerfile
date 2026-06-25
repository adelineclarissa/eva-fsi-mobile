# Use Node.js with Expo recommended version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy all source files
COPY . .

# Expose Expo dev server port
EXPOSE 8081

# Start Expo dev server with lan mode for local network access
CMD ["npx", "expo", "start", "-c", "--port", "8081", "--lan"]
