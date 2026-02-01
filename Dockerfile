# Use the official lightweight Node.js image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy the rest of the server code
COPY . .

# Expose the port Railway will provide
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
