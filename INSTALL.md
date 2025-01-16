# Cloud1604 Business Solution Installation Guide

This guide will help you install the Cloud1604 Business Solution on your server.

## System Requirements

- Ubuntu 20.04 LTS or newer
- Minimum 2 CPU cores
- Minimum 2GB RAM
- Minimum 10GB free disk space
- Root access to the server

## Quick Installation

1. Clone the repository:
```bash
git clone https://github.com/Black1604/business-solution.git
cd business-solution
```

2. Run the installation script:
```bash
chmod +x scripts/install.sh
sudo ./scripts/install.sh
```

The script will automatically:
- Check system requirements
- Install all necessary dependencies
- Configure PostgreSQL database
- Configure Redis
- Set up the application
- Configure Nginx as a reverse proxy

## Post-Installation

1. Access your application at `http://your-server-ip`
2. Log in with the default admin credentials (found in `/root/.admin_credentials`)
3. Change the default admin password
4. Configure email settings in `.env` file

## Manual Configuration (Optional)

If you prefer to configure services manually or need to customize the installation:

1. Database (PostgreSQL):
   - Configuration file: `/etc/postgresql/*/main/postgresql.conf`
   - Credentials file: `/root/.db_password`

2. Cache (Redis):
   - Configuration file: `/etc/redis/redis.conf`
   - Credentials file: `/root/.redis_password`

3. Web Server (Nginx):
   - Configuration file: `/etc/nginx/sites-available/business-solution`

4. Environment Variables:
   - Main configuration: `.env`
   - Example configuration: `.env.example`

## Troubleshooting

Common issues and solutions:

1. **Installation fails**
   - Check system requirements
   - Ensure all ports are available (80, 5432, 6379)
   - Check disk space and permissions

2. **Cannot access application**
   - Verify Nginx is running: `systemctl status nginx`
   - Check application logs: `pm2 logs business-solution`
   - Ensure firewall allows port 80

3. **Database connection issues**
   - Check PostgreSQL status: `systemctl status postgresql`
   - Verify database credentials in `.env`

## Support

For additional support:
- Check the documentation in the `docs` directory
- Submit issues on GitHub
- Contact the system administrator

## Security Notes

1. Change all default passwords
2. Configure SSL/TLS for production use
3. Set up regular backups
4. Keep the system updated
5. Monitor system logs

## Upgrading

To upgrade to a new version:

1. Backup your data:
```bash
pg_dump -U app_user business_solution > backup.sql
```

2. Pull the latest changes:
```bash
git pull origin main
```

3. Run the update script:
```bash
npm run deploy:linux
``` 