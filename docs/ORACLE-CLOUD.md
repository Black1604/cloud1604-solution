# Oracle Cloud Installation Guide

This guide provides step-by-step instructions for installing Cloud1604 Business Solution on Oracle Cloud Infrastructure (OCI).

## Prerequisites

1. Oracle Cloud Account with:
   - Compute instance (VM.Standard.E4.Flex recommended)
   - At least 2 OCPUs and 4GB RAM
   - At least 50GB storage
   - Ubuntu 20.04 LTS or newer

2. Network Security:
   - Port 80/443 open for HTTP/HTTPS
   - Port 22 for SSH access
   - Optional: Port 3000 for development

## Installation Methods

Choose one of the following installation methods:

### Method 1: Quick Installation (Recommended)

1. SSH into your Oracle Cloud instance:
```bash
ssh ubuntu@your-instance-ip
```

2. Clone the repository:
```bash
git clone https://github.com/Black1604/business-solution.git
cd business-solution
```

3. Run the Oracle Cloud installation script:
```bash
chmod +x scripts/install-oracle.sh
sudo ./scripts/install-oracle.sh
```

### Method 2: Manual Installation

Follow these steps if you prefer manual control:

1. Install system dependencies:
```bash
sudo scripts/setup-dependencies.sh
```

2. Configure PostgreSQL:
```bash
sudo scripts/setup-postgresql.sh
```

3. Configure Redis:
```bash
sudo scripts/setup-redis.sh
```

4. Set up Node.js:
```bash
sudo scripts/setup-nodejs.sh
```

5. Configure the application:
```bash
sudo scripts/setup-app.sh
```

### Method 3: Docker Installation

For Docker-based installation:

1. Install Docker and Docker Compose:
```bash
sudo scripts/setup-docker.sh
```

2. Start the application:
```bash
docker-compose up -d
```

## Post-Installation

1. Access your application:
   - Production: https://your-domain.com
   - Development: http://your-ip:3000

2. Default Credentials:
   - Username: admin
   - Password: Found in `/root/.admin_credentials`
   - **Change these immediately!**

3. Configure SSL/TLS:
```bash
sudo scripts/setup-ssl.sh your-domain.com
```

## SSL/TLS Configuration

### Option 1: Domain Name with Let's Encrypt (Recommended)
If you have a domain name:
```bash
sudo scripts/setup-ssl.sh your-domain.com
```

### Option 2: Self-Signed Certificate (Development/Testing)
If you don't have a domain name:

1. Generate self-signed certificate:
```bash
sudo scripts/setup-self-signed-ssl.sh
```

2. Trust the certificate (Development only):
   - Download `/etc/nginx/ssl/ca.crt` from the server
   - Add it to your system's trusted certificates
   - For Windows:
     ```powershell
     Import-Certificate -FilePath ca.crt -CertStoreLocation Cert:\LocalMachine\Root
     ```
   - For macOS:
     ```bash
     sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ca.crt
     ```
   - For Linux:
     ```bash
     sudo cp ca.crt /usr/local/share/ca-certificates/
     sudo update-ca-certificates
     ```

3. Access your application:
   - https://your-server-ip (You'll need to accept the certificate warning in browsers)

Note: Self-signed certificates are not recommended for production use. They will show security warnings in browsers and should only be used for development or testing.

## Monitoring Setup (Optional)

1. Install monitoring tools:
```bash
sudo scripts/setup-monitoring.sh
```

2. Access monitoring:
   - Prometheus: http://your-ip:9090
   - Grafana: http://your-ip:3000/grafana

## Backup Configuration

1. Configure automated backups:
```bash
sudo scripts/setup-backup.sh
```

2. Default backup schedule:
   - Database: Daily at 2 AM
   - Files: Weekly on Sunday at 3 AM
   - Retention: 30 days

## Security Recommendations

1. Update the firewall rules:
```bash
sudo scripts/setup-firewall.sh
```

2. Enable intrusion detection:
```bash
sudo scripts/setup-security.sh
```

3. Regular updates:
```bash
sudo scripts/update-system.sh
```

## Troubleshooting

1. Check system status:
```bash
sudo scripts/check-status.sh
```

2. View logs:
```bash
sudo scripts/view-logs.sh
```

3. Common issues:
   - Database connection: Check PostgreSQL service and credentials
   - Redis connection: Verify Redis service and password
   - Web access: Check Nginx configuration and firewall rules

## Support

- Documentation: https://github.com/Black1604/business-solution/docs
- Issues: https://github.com/Black1604/business-solution/issues
- Email: support@cloud1604.com 