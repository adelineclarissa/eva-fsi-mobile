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

# Start Expo dev server
# --clear-cache: ensure clean start
# --port: Expo dev server port
# -c: clear cache on start
CMD ["npx", "expo", "start", "--clear-cache", "--port", "8081"]
