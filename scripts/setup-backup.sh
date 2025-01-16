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

# Configuration
APP_NAME="business-solution"
BACKUP_DIR="/var/backups/$APP_NAME"
LOG_DIR="/var/log/$APP_NAME"
UPLOAD_DIR="/var/uploads/$APP_NAME"
DB_NAME="business_solution"
DB_USER="app_user"
DB_PASSWORD="$DB_PASSWORD"  # Ensure this is set in the environment
REDIS_PASSWORD="$REDIS_PASSWORD"  # Ensure this is set in the environment
BACKUP_RETENTION_DAYS=7  # Number of days to keep backups

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to perform database backup
backup_database() {
    local backup_file="$BACKUP_DIR/db_backup_$(date +'%Y%m%d_%H%M%S').sql.gz"
    log "Backing up PostgreSQL database..."
    PGPASSWORD="$DB_PASSWORD" pg_dump -U "$DB_USER" -h localhost "$DB_NAME" | gzip > "$backup_file"
    log "Database backup completed: $backup_file"
}

# Function to perform Redis backup
backup_redis() {
    local backup_file="$BACKUP_DIR/redis_backup_$(date +'%Y%m%d_%H%M%S').rdb"
    log "Backing up Redis data..."
    redis-cli -a "$REDIS_PASSWORD" --rdb "$backup_file"
    log "Redis backup completed: $backup_file"
}

# Function to perform application files backup
backup_application_files() {
    local backup_file="$BACKUP_DIR/app_files_backup_$(date +'%Y%m%d_%H%M%S').tar.gz"
    log "Backing up application files..."
    tar -czf "$backup_file" -C /var/www "$APP_NAME"
    log "Application files backup completed: $backup_file"
}

# Function to perform logs backup
backup_logs() {
    local backup_file="$BACKUP_DIR/logs_backup_$(date +'%Y%m%d_%H%M%S').tar.gz"
    log "Backing up application logs..."
    tar -czf "$backup_file" -C /var/log "$APP_NAME"
    log "Logs backup completed: $backup_file"
}

# Function to perform uploads backup
backup_uploads() {
    local backup_file="$BACKUP_DIR/uploads_backup_$(date +'%Y%m%d_%H%M%S').tar.gz"
    log "Backing up uploads..."
    tar -czf "$backup_file" -C /var/uploads "$APP_NAME"
    log "Uploads backup completed: $backup_file"
}

# Function to clean up old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $BACKUP_RETENTION_DAYS days..."
    find "$BACKUP_DIR" -type f -name '*.gz' -mtime +$BACKUP_RETENTION_DAYS -exec rm -f {} \;
    log "Old backups cleanup completed."
}

# Main backup process
log "Starting backup process..."
backup_database
backup_redis
backup_application_files
backup_logs
backup_uploads
cleanup_old_backups
log "Backup process completed successfully!"
