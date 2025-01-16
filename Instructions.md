# Cloud1604 Business Solution - Installation Guide

This guide provides step-by-step instructions for deploying the Cloud1604 Business Solution on Oracle Cloud Infrastructure with Ubuntu 22.04.

## Prerequisites

Before beginning the installation, ensure you have:

1. Oracle Cloud Ubuntu 22.04 instance with:
   - Minimum 2 vCPUs
   - 8GB RAM
   - 50GB storage
   - Ports 22 (SSH), 80 (HTTP), 443 (HTTPS) open in security list
2. SSH access to your instance
3. Sudo privileges
4. Domain name (optional)

## Pre-Installation Steps

### 1. Generate Secure Passwords
First, we'll generate secure passwords for our services. Download and run the password generation script:

```bash
wget https://raw.githubusercontent.com/Black1604/business-solution/main/scripts/generate-passwords.sh
chmod +x generate-passwords.sh
./generate-passwords.sh
```

**Important**: Save the generated passwords securely. You'll need them in the following steps:
- PostgreSQL password
- Redis password
- NextAuth secret

### 2. Update System
```bash
sudo apt update
sudo apt upgrade -y
```

## Component Installation

### 1. PostgreSQL Setup
```bash
wget https://raw.githubusercontent.com/Black1604/business-solution/main/scripts/setup-postgresql.sh
chmod +x setup-postgresql.sh
sudo ./setup-postgresql.sh
```

Verify PostgreSQL installation:
```bash
sudo systemctl status postgresql
psql --version
```

### 2. Redis Setup
```bash
wget https://raw.githubusercontent.com/Black1604/business-solution/main/scripts/setup-redis.sh
chmod +x setup-redis.sh
sudo ./setup-redis.sh
```

Verify Redis installation:
```bash
sudo systemctl status redis
redis-cli ping
```

### 3. Node.js Setup
```bash
wget https://raw.githubusercontent.com/Black1604/business-solution/main/scripts/setup-nodejs.sh
chmod +x setup-nodejs.sh
sudo ./setup-nodejs.sh
```

Verify Node.js installation:
```bash
node --version
npm --version
pm2 --version
```

### 4. (Optional) Monitoring Setup
```bash
wget https://raw.githubusercontent.com/Black1604/business-solution/main/scripts/setup-monitoring.sh
chmod +x setup-monitoring.sh
sudo ./setup-monitoring.sh
```

Verify monitoring services:
```bash
sudo systemctl status prometheus
sudo systemctl status grafana-server
```

## Application Deployment

### 1. Clone Repository
```bash
git clone https://github.com/Black1604/business-solution.git
cd business-solution
```

### 2. Configure Environment
```bash
cp .env.example .env
nano .env
```

Update the following in your .env file:
- DATABASE_URL (using PostgreSQL password)
- REDIS_URL (using Redis password)
- NEXTAUTH_SECRET
- Other required variables from .env.example

### 3. Install Dependencies and Build
```bash
npm install
npm run build
```

### 4. Start Application
```bash
pm2 start npm --name "cloud1604-business-solution" -- start
pm2 save
```

### 5. Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/cloud1604-business-solution
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name your_domain_or_ip;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/cloud1604-business-solution /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. SSL Configuration (Optional)
If you have a domain name:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your_domain
```

## Verification Steps

1. Check application status:
```bash
pm2 status
```

2. Verify web access:
   - HTTP: http://your_domain_or_ip
   - HTTPS: https://your_domain (if SSL configured)

3. Check logs:
```bash
pm2 logs cloud1604-business-solution
```

## Troubleshooting

### Common Issues

1. Application won't start
   - Check .env configuration
   - Verify database connection
   - Check npm install completed successfully

2. Database connection issues
   - Verify PostgreSQL is running
   - Check database credentials
   - Verify database exists

3. Redis connection issues
   - Check Redis service status
   - Verify Redis password
   - Check Redis port accessibility

### Logs Location
- Application logs: `~/.pm2/logs/`
- Nginx logs: `/var/log/nginx/`
- PostgreSQL logs: `/var/log/postgresql/`
- Redis logs: `/var/log/redis/`

## Security Notes

1. Change default passwords
2. Keep system updated
3. Configure firewall rules
4. Monitor system logs
5. Set up regular backups

## Next Steps

1. Create initial admin user
2. Configure email settings
3. Set up monitoring alerts
4. Configure backup schedule

For additional support, refer to the documentation in the `docs` directory or contact the system administrator. 