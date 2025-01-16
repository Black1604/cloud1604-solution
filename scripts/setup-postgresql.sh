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

# Install PostgreSQL and required packages
log "Installing PostgreSQL and required packages..."
apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL service
log "Starting PostgreSQL service..."
systemctl start postgresql
systemctl enable postgresql

# Configure PostgreSQL
PG_VERSION=$(psql --version | awk '{print $3}' | cut -d. -f1)
PG_CONF="/etc/postgresql/$PG_VERSION/main/postgresql.conf"
PG_HBA="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"
SSL_DIR="/etc/postgresql/ssl"

# Create SSL directory and generate certificates
log "Configuring SSL..."
mkdir -p $SSL_DIR
cd $SSL_DIR
openssl req -new -x509 -days 365 -nodes -text -out server.crt \
    -keyout server.key \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=your-domain.com"
chmod 600 server.key
chown postgres:postgres server.key server.crt

# Update PostgreSQL configuration
log "Updating PostgreSQL configuration..."
cat >> $PG_CONF << EOF

# Connection Settings
listen_addresses = '*'
max_connections = 100
superuser_reserved_connections = 3

# Memory Settings
shared_buffers = 256MB
work_mem = 16MB
maintenance_work_mem = 64MB
effective_cache_size = 768MB

# Write Ahead Log
wal_buffers = 16MB
synchronous_commit = off
checkpoint_completion_target = 0.9

# SSL Configuration
ssl = on
ssl_cert_file = '$SSL_DIR/server.crt'
ssl_key_file = '$SSL_DIR/server.key'

# Query Planning
random_page_cost = 1.1
effective_io_concurrency = 200

# Monitoring
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.max = 10000
pg_stat_statements.track = all
EOF

# Update pg_hba.conf
log "Updating client authentication configuration..."
cat > $PG_HBA << EOF
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all            postgres                                peer
local   all            all                                     scram-sha-256
host    all            all             127.0.0.1/32            scram-sha-256
host    all            all             ::1/128                 scram-sha-256
hostssl all            all             0.0.0.0/0               scram-sha-256
EOF

# Create application database and user
log "Creating application database and user..."
su - postgres -c "psql -c \"CREATE DATABASE business_solution;\""
su - postgres -c "psql -c \"CREATE USER app_user WITH ENCRYPTED PASSWORD 'temp_password';\""
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE business_solution TO app_user;\""

# Create backup directory
log "Setting up backup directory..."
BACKUP_DIR="/var/backups/postgresql"
mkdir -p $BACKUP_DIR
chown postgres:postgres $BACKUP_DIR

# Create backup script
log "Creating backup script..."
cat > /usr/local/bin/backup-postgres.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump -U postgres business_solution | gzip > "$BACKUP_DIR/business_solution_$TIMESTAMP.sql.gz"
find "$BACKUP_DIR" -type f -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-postgres.sh
chown postgres:postgres /usr/local/bin/backup-postgres.sh

# Set up daily backup cron job
log "Setting up backup cron job..."
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-postgres.sh") | crontab -

# Enable monitoring extensions
log "Enabling monitoring extensions..."
su - postgres -c "psql -d business_solution -c 'CREATE EXTENSION IF NOT EXISTS pg_stat_statements;'"
su - postgres -c "psql -d business_solution -c 'CREATE EXTENSION IF NOT EXISTS pg_buffercache;'"

# Restart PostgreSQL
log "Restarting PostgreSQL..."
systemctl restart postgresql

# Final steps
log "Installation completed successfully!"
log "Please update the application's .env file with the following connection string:"
log "DATABASE_URL=\"postgresql://app_user:temp_password@localhost:5432/business_solution?sslmode=verify-full\""
log "IMPORTANT: Change the temporary password using:"
log "PostgreSQL: ALTER USER app_user WITH PASSWORD 'your_secure_password';"

# Print PostgreSQL version and status
log "PostgreSQL version: $(su - postgres -c "psql -V")"

# Verify services
log "Verifying PostgreSQL service..."
systemctl status postgresql --no-pager

# Verify SSL configuration
log "Verifying SSL configuration..."
su - postgres -c "psql -c \"SHOW ssl;\""
su - postgres -c "psql -c \"SELECT * FROM pg_stat_ssl;\""