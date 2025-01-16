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

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    error "Please run as root"
    exit 1
fi

# Configuration
SSL_DIR="/etc/nginx/ssl"
DAYS_VALID=365
SERVER_IP=$(curl -s ifconfig.me)
APP_NAME="business-solution"

# Create SSL directory
log "Creating SSL directory..."
mkdir -p "$SSL_DIR"
cd "$SSL_DIR"

# Generate CA private key and certificate
log "Generating CA certificate..."
openssl genpkey -algorithm RSA -aes256 -out ca.key -pass pass:temp1234
openssl req -x509 -new -nodes -key ca.key -sha256 -days $DAYS_VALID -out ca.crt \
    -passin pass:temp1234 \
    -subj "/C=US/ST=State/L=City/O=Cloud1604/CN=Cloud1604 Root CA"

# Generate server private key
log "Generating server private key..."
openssl genpkey -algorithm RSA -out server.key

# Create server certificate configuration
cat > server.conf << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = req_ext

[dn]
C = US
ST = State
L = City
O = Cloud1604
CN = $SERVER_IP

[req_ext]
subjectAltName = @alt_names

[alt_names]
IP.1 = $SERVER_IP
DNS.1 = localhost
EOF

# Generate server CSR
log "Generating server certificate request..."
openssl req -new -key server.key -out server.csr -config server.conf

# Generate server certificate
log "Generating server certificate..."
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
    -out server.crt -days $DAYS_VALID -sha256 -passin pass:temp1234 \
    -extensions req_ext -extfile server.conf

# Set proper permissions
log "Setting permissions..."
chmod 600 ca.key server.key
chmod 644 ca.crt server.crt
chown -R root:root "$SSL_DIR"

# Configure Nginx
log "Configuring Nginx..."
cat > "/etc/nginx/sites-available/$APP_NAME" << EOF
server {
    listen 80;
    server_name $SERVER_IP;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl;
    server_name $SERVER_IP;

    ssl_certificate $SSL_DIR/server.crt;
    ssl_certificate_key $SSL_DIR/server.key;
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
ln -sf "/etc/nginx/sites-available/$APP_NAME" "/etc/nginx/sites-enabled/"
nginx -t && systemctl restart nginx

# Final steps
log "SSL setup completed successfully!"
log "Your certificates are located in: $SSL_DIR"
log "Access your application at: https://$SERVER_IP"
warning "Important: Add $SSL_DIR/ca.crt to your system's trusted certificates for development use"

# Print summary
echo "
SSL Configuration Summary:
------------------------
- Server IP: $SERVER_IP
- Certificate Path: $SSL_DIR/server.crt
- Private Key Path: $SSL_DIR/server.key
- CA Certificate: $SSL_DIR/ca.crt
- Validity: $DAYS_VALID days

Next Steps:
1. Download $SSL_DIR/ca.crt to your local machine
2. Add the CA certificate to your system's trusted certificates
3. Access the application at https://$SERVER_IP
" 