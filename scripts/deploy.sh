#!/bin/bash

# Exit on error
set -e

# Configuration
APP_NAME="business-solution"
APP_DIR="/var/www/$APP_NAME"
BACKUP_DIR="/var/backups/$APP_NAME"
LOG_FILE="/var/log/$APP_NAME/deploy.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    log "Please run as root"
    exit 1
fi

# Validate environment
log "Validating environment..."
if [ ! -f .env.production ]; then
    log "Error: .env.production file not found"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
log "Creating database backup..."
BACKUP_FILE="$BACKUP_DIR/db_backup_$(date +'%Y%m%d_%H%M%S').sql"
pg_dump -U app_user business_solution > "$BACKUP_FILE"
gzip "$BACKUP_FILE"
log "Database backup created at $BACKUP_FILE.gz"

# Pull latest changes
log "Pulling latest changes..."
git pull origin main

# Install dependencies
log "Installing dependencies..."
npm install --production

# Generate Prisma client
log "Generating Prisma client..."
npx prisma generate

# Run database migrations
log "Running database migrations..."
npx prisma migrate deploy

# Build application
log "Building application..."
npm run build

# Update PM2 configuration
log "Updating PM2 configuration..."
if pm2 list | grep -q "$APP_NAME"; then
    pm2 reload "$APP_NAME"
else
    pm2 start npm --name "$APP_NAME" -- start
fi
pm2 save

# Test application health
log "Testing application health..."
MAX_RETRIES=5
RETRY_COUNT=0
HEALTH_CHECK_URL="http://localhost:3000/api/health"

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s "$HEALTH_CHECK_URL" | grep -q "ok"; then
        log "Application is healthy"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT+1))
        if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
            log "Error: Application health check failed after $MAX_RETRIES attempts"
            # Rollback to previous version if needed
            exit 1
        fi
        log "Health check failed, retrying in 5 seconds..."
        sleep 5
    fi
done

# Cleanup old backups
log "Cleaning up old backups..."
find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +30 -delete

# Reload Nginx
log "Reloading Nginx..."
nginx -t && systemctl reload nginx

# Final status
log "Deployment completed successfully"

# Print summary
echo "
Deployment Summary:
------------------
- Application: $APP_NAME
- Directory: $APP_DIR
- Database Backup: $BACKUP_FILE.gz
- Log File: $LOG_FILE
- Status: Success
" 