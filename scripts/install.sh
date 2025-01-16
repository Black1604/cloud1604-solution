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

# Function to check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then 
        error "Please run as root"
        exit 1
    }

    # Check minimum system requirements
    CPU_CORES=$(nproc)
    TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
    DISK_SPACE=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')

    if [ $CPU_CORES -lt 2 ]; then
        warning "Minimum 2 CPU cores recommended (found: $CPU_CORES)"
    fi

    if [ $TOTAL_MEM -lt 2048 ]; then
        warning "Minimum 2GB RAM recommended (found: $((TOTAL_MEM/1024))GB)"
    fi

    if [ $DISK_SPACE -lt 10 ]; then
        warning "Minimum 10GB free disk space recommended (found: ${DISK_SPACE}GB)"
    fi
}

# Function to generate secure passwords
generate_password() {
    < /dev/urandom tr -dc 'A-Za-z0-9!#%&()*+,-./:;<=>?@[]^_{|}~' | head -c 32
}

# Function to install system dependencies
install_dependencies() {
    log "Installing system dependencies..."
    apt update
    apt install -y curl build-essential git nginx postgresql redis-server
}

# Function to install Node.js
install_nodejs() {
    log "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    npm install -g pm2
    pm2 startup ubuntu
}

# Function to configure PostgreSQL
setup_database() {
    log "Configuring PostgreSQL..."
    DB_PASSWORD=$(generate_password)
    
    # Create database and user
    sudo -u postgres psql -c "CREATE DATABASE business_solution;"
    sudo -u postgres psql -c "CREATE USER app_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE business_solution TO app_user;"
    
    # Configure PostgreSQL for better performance
    cat >> /etc/postgresql/*/main/postgresql.conf << EOF
shared_buffers = 256MB
work_mem = 8MB
maintenance_work_mem = 64MB
effective_cache_size = 512MB
EOF

    # Restart PostgreSQL
    systemctl restart postgresql
    
    echo $DB_PASSWORD > /root/.db_password
    chmod 600 /root/.db_password
}

# Function to configure Redis
setup_redis() {
    log "Configuring Redis..."
    REDIS_PASSWORD=$(generate_password)
    
    # Update Redis configuration
    sed -i "s/# requirepass foobared/requirepass $REDIS_PASSWORD/" /etc/redis/redis.conf
    
    # Configure Redis for better performance
    cat >> /etc/redis/redis.conf << EOF
maxmemory 256mb
maxmemory-policy allkeys-lru
EOF

    # Restart Redis
    systemctl restart redis-server
    
    echo $REDIS_PASSWORD > /root/.redis_password
    chmod 600 /root/.redis_password
}

# Function to configure environment
setup_environment() {
    log "Setting up environment..."
    NEXTAUTH_SECRET=$(generate_password)
    DB_PASSWORD=$(cat /root/.db_password)
    REDIS_PASSWORD=$(cat /root/.redis_password)
    
    # Create .env file
    cat > .env << EOF
# Environment
NODE_ENV=production

# Database
DATABASE_URL="postgresql://app_user:${DB_PASSWORD}@localhost:5432/business_solution?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# NextAuth
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
NEXTAUTH_URL=http://localhost:3000

# Email (configure these later)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EOF
}

# Function to install application
install_application() {
    log "Installing application..."
    
    # Install dependencies
    npm install
    
    # Generate Prisma client
    npx prisma generate
    
    # Run database migrations
    npx prisma migrate deploy
    
    # Build application
    npm run build
    
    # Start application with PM2
    pm2 start npm --name "business-solution" -- start
    pm2 save
}

# Function to configure Nginx
setup_nginx() {
    log "Configuring Nginx..."
    
    # Create Nginx configuration
    cat > /etc/nginx/sites-available/business-solution << EOF
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

    # Enable site
    ln -sf /etc/nginx/sites-available/business-solution /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test and reload Nginx
    nginx -t && systemctl reload nginx
}

# Main installation process
main() {
    log "Starting Cloud1604 Business Solution installation..."
    
    check_requirements
    install_dependencies
    install_nodejs
    setup_database
    setup_redis
    setup_environment
    install_application
    setup_nginx
    
    log "Installation completed successfully!"
    log "Access your application at: http://your-server-ip"
    log "Default admin credentials have been saved to: /root/.admin_credentials"
    log "Please change these credentials after first login!"
}

# Run main installation
main 