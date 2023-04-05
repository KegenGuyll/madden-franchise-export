#!/bin/bash
FROM node:14.17.0-alpine

# Set working directory
WORKDIR /usr/app


# Copy "package.json" and "package-lock.json" before other files
# Utilise Docker cacheto save re-installing dependencies if unchanged
COPY ./package*.json ./package-lock.json ./

# Install dependencies
RUN npm install --frozen-lockfile

# Copy all files
COPY ./ ./

# Build app
# RUN yarn build

# Expose the listening port
EXPOSE 8080

# Run container as non-root (unprivileged) user
# The "node" user is provided in the Node.js Alpine base image
USER node

# Launch app with PM2
CMD ["node", "index.js"]