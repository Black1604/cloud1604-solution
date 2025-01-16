#!/bin/bash

# Exit on error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log messages
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Configuration
APP_NAME="business-solution"
APP_DIR="/var/www/$APP_NAME"
BACKUP_DIR="/var/backups/$APP_NAME"
LOG_DIR="/var/log/$APP_NAME"
UPLOAD_DIR="/var/uploads/$APP_NAME"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    error "Please run as root"
    exit 1
fi

# Create necessary directories
log "Creating application directories..."
mkdir -p "$APP_DIR" "$BACKUP_DIR" "$LOG_DIR" "$UPLOAD_DIR"

# Update system
log "Updating system packages..."
apt update && apt upgrade -y

# Install system dependencies
log "Installing system dependencies..."
apt install -y curl build-essential git nginx postgresql redis-server

# Install Node.js
log "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
npm install -g pm2
pm2 startup ubuntu

# Generate secure passwords
log "Generating secure passwords..."
DB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
ADMIN_PASSWORD=$(openssl rand -base64 12)

# Configure PostgreSQL
log "Configuring PostgreSQL..."
sudo -u postgres psql -c "CREATE DATABASE business_solution;"
sudo -u postgres psql -c "CREATE USER app_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE business_solution TO app_user;"

# Configure Redis
log "Configuring Redis..."
sed -i "s/# requirepass foobared/requirepass $REDIS_PASSWORD/" /etc/redis/redis.conf
systemctl restart redis-server

# Clone application
log "Cloning application..."
git clone https://github.com/Black1604/cloud1604-solution.git "$APP_DIR"
cd "$APP_DIR"

# Create environment file
log "Creating environment file..."
cat > .env.production << EOF
# Environment
NODE_ENV=production
APP_NAME="Business Solution System"
NEXTAUTH_URL=http://localhost
NEXTAUTH_SECRET=$NEXTAUTH_SECRET

# Database
DATABASE_URL="postgresql://app_user:$DB_PASSWORD@localhost:5432/business_solution?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD

# File Storage
UPLOAD_PATH=$UPLOAD_DIR

# Logging
LOG_LEVEL=info
LOG_PATH=$LOG_DIR
EOF

# Install dependencies
log "Installing application dependencies..."
npm install --production

# Generate Prisma client
log "Generating Prisma client..."
npx prisma generate

# Run database migrations
log "Running database migrations..."
npx prisma migrate deploy

# Create admin user
log "Creating admin user..."
npx prisma db seed

# Build application
log "Building application..."
npm run build

# Configure PM2
log "Configuring PM2..."
pm2 start npm --name "$APP_NAME" -- start
pm2 save

# Configure Nginx
log "Configuring Nginx..."
cat > /etc/nginx/sites-available/$APP_NAME << EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Save credentials
log "Saving credentials..."
cat > /root/.app_credentials << EOF
Application Credentials
----------------------
Database User: app_user
Database Password: $DB_PASSWORD
Redis Password: $REDIS_PASSWORD
NextAuth Secret: $NEXTAUTH_SECRET
Admin Username: admin
Admin Password: $ADMIN_PASSWORD

Important: Change these passwords after installation!
EOF
chmod 600 /root/.app_credentials

# Setup monitoring (optional)
log "Setting up monitoring..."
./scripts/setup-monitoring.sh

# Setup backup script
log "Setting up backup script..."
./scripts/setup-backup.sh

# Final steps
log "Installation completed successfully!"
log "Access your application at: http://your-server-ip"
log "Admin credentials have been saved to: /root/.app_credentials"
log "Please change the admin password after first login!"

# Print summary
echo "
Installation Summary:
--------------------
- Application: $APP_NAME
- Directory: $APP_DIR
- Logs: $LOG_DIR
- Backups: $BACKUP_DIR
- Uploads: $UPLOAD_DIR
- Status: Success

Next Steps:
1. Configure SSL/TLS (recommended)
2. Change default passwords
3. Configure email settings
4. Set up domain name
" 
