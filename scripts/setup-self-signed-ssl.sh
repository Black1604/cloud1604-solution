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

# Step 1: Open Required Ports
open_ports() {
    log "Installing required tools..."
    apt install -y git net-tools zip unzip nginx

    log "Enabling and starting Nginx..."
    systemctl enable nginx
    systemctl start nginx

    log "Opening required ports..."
    PORTS=(80 443 3000 5432 6379)  # Add or remove ports as needed
    for PORT in "${PORTS[@]}"; do
        iptables -I INPUT 6 -m state --state NEW -p tcp --dport "$PORT" -j ACCEPT
        log "Port $PORT opened."
    done

    log "Saving iptables rules..."
    netfilter-persistent save

    log "Restarting Nginx..."
    systemctl restart nginx
}

# Step 2: Clone the Repository
clone_repo() {
    log "Cloning the repository..."
    git clone https://github.com/Black1604/cloud1604-solution.git /var/www/business-solution

    log "Setting permissions..."
    chmod -R +x /var/www/business-solution
}

# Step 3: Generate Passwords
generate_passwords() {
    log "Generating secure passwords..."
    /var/www/business-solution/scripts/generate-passwords.sh

    log "Loading generated passwords..."
    source /var/www/business-solution/scripts/generate-passwords.sh
}

# Step 4: Detect IP Address
get_ip() {
    log "Detecting IP address..."
    IP_ADDRESS=$(hostname -I | awk '{print $1}')
    if [ -z "$IP_ADDRESS" ]; then
        error "Unable to detect IP address. Please enter it manually."
    fi

    read -p "Detected IP address: $IP_ADDRESS. Is this correct? [Y/n]: " CONFIRM
    if [[ "$CONFIRM" =~ ^[Nn]$ ]]; then
        read -p "Enter the correct IP address: " IP_ADDRESS
    fi

    log "Using IP address: $IP_ADDRESS"
}

# Step 5: Update Environment Files
update_env_files() {
    log "Updating environment files..."
    cd /var/www/business-solution

    if [ -f ".env.example" ]; then
        cp .env.example .env
        sed -i "s|NEXTAUTH_URL=http://localhost|NEXTAUTH_URL=http://$IP_ADDRESS|g" .env
        sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"postgresql://app_user:$DB_PASSWORD@localhost:5432/business_solution?schema=public\"|g" .env
        sed -i "s|REDIS_PASSWORD=.*|REDIS_PASSWORD=$REDIS_PASSWORD|g" .env
        log ".env file updated."
    else
        warning ".env.example not found! Skipping .env file update."
    fi

    if [ -f ".env.production.example" ]; then
        cp .env.production.example .env.production
        sed -i "s|NEXTAUTH_URL=http://localhost|NEXTAUTH_URL=http://$IP_ADDRESS|g" .env.production
        sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"postgresql://app_user:$DB_PASSWORD@localhost:5432/business_solution?schema=public\"|g" .env.production
        sed -i "s|REDIS_PASSWORD=.*|REDIS_PASSWORD=$REDIS_PASSWORD|g" .env.production
        log ".env.production file updated."
    else
        warning ".env.production.example not found! Skipping .env.production file update."
    fi
}

# Step 6: Run the Installation Script
run_installation() {
    log "Running the installation script..."
    cd /var/www/business-solution
    sudo ./install-oracle.sh
}

# Step 7: Set Up Self-Signed SSL
setup_ssl() {
    log "Setting up self-signed SSL..."
    /var/www/business-solution/scripts/setup-self-signed-ssl.sh "$IP_ADDRESS"
}

# Step 8: Download CA Certificate
download_ca_cert() {
    log "Downloading CA certificate..."
    if [ -f "/etc/nginx/ssl/ca.crt" ]; then
        scp root@$IP_ADDRESS:/etc/nginx/ssl/ca.crt ./ca.crt
        log "CA certificate downloaded to: $(pwd)/ca.crt"
    else
        warning "CA certificate not found. Please download it manually from /etc/nginx/ssl/ca.crt."
    fi
}

# Step 9: Provide Instructions for Trusting the Certificate
trust_ca_cert() {
    log "Follow these steps to trust the CA certificate:"
    echo "
1. Linux:
   - Copy the certificate to /usr/local/share/ca-certificates/
   - Run: sudo update-ca-certificates

2. macOS:
   - Double-click the certificate and add it to the 'System' keychain.

3. Windows:
   - Import the certificate into the 'Trusted Root Certification Authorities' store.
"
}

# Main script
log "Starting setup process..."

# Step 1: Open Required Ports
open_ports

# Step 2: Clone the Repository
clone_repo

# Step 3: Generate Passwords
generate_passwords

# Step 4: Detect IP Address
get_ip

# Step 5: Update Environment Files
update_env_files

# Step 6: Run the Installation Script
run_installation

# Step 7: Set Up Self-Signed SSL
setup_ssl

# Step 8: Download CA Certificate
download_ca_cert

# Step 9: Provide Instructions for Trusting the Certificate
trust_ca_cert

log "Setup completed successfully!"
log "Access your application at: https://$IP_ADDRESS"
