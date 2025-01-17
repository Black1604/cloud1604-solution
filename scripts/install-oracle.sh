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
    exit 1
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
fi

# Create necessary directories
log "Creating application directories..."
mkdir -p "$APP_DIR" "$BACKUP_DIR" "$LOG_DIR" "$UPLOAD_DIR"

# Install system dependencies
log "Installing system dependencies..."
apt install -y curl build-essential git nginx postgresql redis-server

# Install Node.js
log "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
npm install -g pm2
pm2 startup systemd -u root --hp /root

# Configure PostgreSQL
log "Configuring PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql
sudo -u postgres psql -c "CREATE DATABASE business_solution;"
sudo -u postgres psql -c "CREATE USER app_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE business_solution TO app_user;"

# Configure Redis
log "Configuring Redis..."
sed -i "s/# requirepass foobared/requirepass $REDIS_PASSWORD/" /etc/redis/redis.conf
systemctl restart redis-server

# Fix permissions for node_modules/.bin
log "Fixing permissions for node_modules/.bin..."
chmod -R 755 node_modules/.bin

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
    server_name $IP_ADDRESS;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl;
    server_name $IP_ADDRESS;

    ssl_certificate /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site and restart Nginx
log "Enabling site and restarting Nginx..."
ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

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

# Final steps
log "Installation completed successfully!"
log "Access your application at: https://$IP_ADDRESS"
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
1. Configure SSL/TLS (if not already done)
2. Change default passwords
3. Configure email settings
4. Set up domain name
"
