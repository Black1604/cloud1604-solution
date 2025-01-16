#!/bin/bash

# Exit on error
set -e

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Check if script is run as root
if [ "$EUID" -ne 0 ]; then
    log "Please run as root"
    exit 1
fi

# Install system dependencies
log "Installing system dependencies..."
apt install -y curl build-essential

# Install Node.js
log "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify Node.js installation
log "Node.js version: $(node -v)"
log "NPM version: $(npm -v)"

# Install PM2
log "Installing PM2..."
npm install -g pm2

# Configure PM2 startup
log "Configuring PM2 startup..."
pm2 startup ubuntu
env PATH=$PATH:/usr/bin pm2 startup ubuntu -u $USER --hp /home/$USER

# Print PM2 version
log "PM2 version: $(pm2 -v)"

# Final steps
log "Node.js and PM2 installation completed successfully!"
log "You can now deploy your application using PM2:"
log "cd /path/to/app && pm2 start npm --name \"cloud1604-business-solution\" -- start" 