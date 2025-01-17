#!/bin/bash

# Exit on error
set -e

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Function to generate a secure password
generate_password() {
    # Generate a 32-character password with letters, numbers, and symbols
    < /dev/urandom tr -dc 'A-Za-z0-9!#%&()*+,-./:;<=>?@[]^_{|}~' | head -c 32
}

# Generate passwords
POSTGRES_PASSWORD=$(generate_password)
REDIS_PASSWORD=$(generate_password)
NEXTAUTH_SECRET=$(generate_password)
ADMIN_PASSWORD=$(generate_password)

# Export passwords as environment variables
export POSTGRES_PASSWORD
export REDIS_PASSWORD
export NEXTAUTH_SECRET
export ADMIN_PASSWORD

# Save passwords to a secure file
cat > /root/.app_credentials << EOF
Application Credentials
----------------------
Database User: app_user
Database Password: $POSTGRES_PASSWORD
Redis Password: $REDIS_PASSWORD
NextAuth Secret: $NEXTAUTH_SECRET
Admin Username: admin
Admin Password: $ADMIN_PASSWORD

Important: Change these passwords after installation!
EOF
chmod 600 /root/.app_credentials

# Print passwords (for manual configuration)
log "Generated secure passwords:"
echo
echo "PostgreSQL Password: $POSTGRES_PASSWORD"
echo "Redis Password: $REDIS_PASSWORD"
echo "NextAuth Secret: $NEXTAUTH_SECRET"
echo "Admin Password: $ADMIN_PASSWORD"
echo
log "These passwords have been saved to /root/.app_credentials"
log "Make sure to:"
log "1. Use the PostgreSQL password when configuring the database"
log "2. Use the Redis password when configuring Redis"
log "3. Keep these passwords in a secure location"
log "4. Delete this terminal output after noting the passwords"
