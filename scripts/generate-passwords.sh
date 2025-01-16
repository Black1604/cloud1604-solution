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

# Create .env file with passwords
cat > .env << EOF
# Database
DATABASE_URL="postgresql://app_user:${POSTGRES_PASSWORD}@localhost:5432/business_solution?sslmode=verify-full"

# Redis
REDIS_URL="redis://:${REDIS_PASSWORD}@localhost:6379"

# NextAuth
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
EOF

# Print passwords (for manual configuration)
log "Generated secure passwords:"
echo
echo "PostgreSQL Password: $POSTGRES_PASSWORD"
echo "Redis Password: $REDIS_PASSWORD"
echo "NextAuth Secret: $NEXTAUTH_SECRET"
echo
log "These passwords have been saved to .env"
log "Make sure to:"
log "1. Use the PostgreSQL password when running setup-postgresql.sh"
log "2. Use the Redis password when running setup-redis.sh"
log "3. Keep these passwords in a secure location"
log "4. Delete this terminal output after noting the passwords" 