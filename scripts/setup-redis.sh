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

# Install Redis
log "Installing Redis..."
apt install -y redis-server

# Configure Redis
log "Configuring Redis..."
REDIS_CONF="/etc/redis/redis.conf"

# Backup original configuration
cp $REDIS_CONF "${REDIS_CONF}.backup"

# Update Redis configuration
cat > $REDIS_CONF << EOF
# Network
bind 127.0.0.1
port 6379
protected-mode yes

# General
daemonize yes
supervised systemd
pidfile /var/run/redis/redis-server.pid
loglevel notice
logfile /var/log/redis/redis-server.log

# Memory Management
maxmemory 256mb
maxmemory-policy allkeys-lru
maxmemory-samples 5

# Persistence
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis

# Security
requirepass temp_password

# Performance Tuning
tcp-keepalive 300
timeout 0
tcp-backlog 511
databases 16
EOF

# Set proper permissions
chown redis:redis $REDIS_CONF
chmod 640 $REDIS_CONF

# Start and enable Redis
log "Starting Redis service..."
systemctl start redis-server
systemctl enable redis-server

# Verify Redis installation
log "Verifying Redis installation..."
systemctl status redis-server --no-pager
redis-cli --version

# Final steps
log "Redis installation completed successfully!"
log "Please update your application's .env file with:"
log "REDIS_URL=\"redis://:temp_password@localhost:6379\""
log "IMPORTANT: Change the temporary password in $REDIS_CONF"
log "Update 'requirepass' in $REDIS_CONF and restart Redis:"
log "systemctl restart redis-server" 