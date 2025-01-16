# PostgreSQL Setup Guide for Oracle Cloud Ubuntu 22.04

This guide provides step-by-step instructions for installing and configuring PostgreSQL on an Oracle Cloud Ubuntu 22.04 instance for the Business Solution System.

## Prerequisites

- Oracle Cloud Ubuntu 22.04 instance
- SSH access to the instance
- Sudo privileges

## Installation Steps

1. Update the system packages:
```bash
sudo apt update && sudo apt upgrade -y
```

2. Install PostgreSQL and required packages:
```bash
sudo apt install postgresql postgresql-contrib -y
```

3. Verify the installation:
```bash
psql --version
sudo systemctl status postgresql
```

## Initial Configuration

1. Start and enable PostgreSQL service:
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

2. Access PostgreSQL command prompt:
```bash
sudo -u postgres psql
```

3. Create a database and user for the application:
```sql
CREATE DATABASE business_solution;
CREATE USER app_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE business_solution TO app_user;
```

4. Configure PostgreSQL for remote access (if needed):

Edit postgresql.conf:
```bash
sudo nano /etc/postgresql/14/main/postgresql.conf
```

Update the following line:
```
listen_addresses = '*'
```

Edit pg_hba.conf:
```bash
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

Add the following lines (adjust according to your security requirements):
```
# IPv4 remote connections:
hostssl all         all         0.0.0.0/0             scram-sha-256
```

5. Configure SSL:
```bash
# Generate self-signed certificate (for testing)
sudo mkdir -p /etc/postgresql/ssl
cd /etc/postgresql/ssl
sudo openssl req -new -x509 -days 365 -nodes -text -out server.crt \
  -keyout server.key -subj "/CN=your-domain.com"
sudo chmod 600 server.key
sudo chown postgres:postgres server.key server.crt

# Update postgresql.conf
sudo nano /etc/postgresql/14/main/postgresql.conf
```

Add/update the following lines:
```
ssl = on
ssl_cert_file = '/etc/postgresql/ssl/server.crt'
ssl_key_file = '/etc/postgresql/ssl/server.key'
```

6. Restart PostgreSQL to apply changes:
```bash
sudo systemctl restart postgresql
```

## Security Recommendations

1. Configure firewall rules:
```bash
sudo ufw allow 5432/tcp
sudo ufw enable
```

2. Use strong passwords and limit access:
```sql
ALTER USER app_user WITH PASSWORD 'your_secure_password';
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
```

3. Regular backups:
```bash
# Create backup directory
sudo mkdir -p /var/backups/postgresql
sudo chown postgres:postgres /var/backups/postgresql

# Create backup script
sudo nano /usr/local/bin/backup-postgres.sh
```

Add the following content:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump -U postgres business_solution | gzip > "$BACKUP_DIR/business_solution_$TIMESTAMP.sql.gz"
find "$BACKUP_DIR" -type f -mtime +30 -delete
```

Make the script executable and set up a cron job:
```bash
sudo chmod +x /usr/local/bin/backup-postgres.sh
sudo crontab -e
```

Add the following line for daily backups at 2 AM:
```
0 2 * * * /usr/local/bin/backup-postgres.sh
```

## Performance Tuning

Edit postgresql.conf with recommended settings:
```bash
sudo nano /etc/postgresql/14/main/postgresql.conf
```

Add/update the following settings:
```
# Memory Configuration
shared_buffers = 256MB                  # 25% of available RAM
work_mem = 16MB                         # Depends on max_connections
maintenance_work_mem = 64MB             # For maintenance operations

# Query Planning
effective_cache_size = 768MB            # 75% of available RAM
random_page_cost = 1.1                  # For SSD storage

# Write Ahead Log
wal_buffers = 16MB                      # 1/32 of shared_buffers
synchronous_commit = off                # Only if data loss is acceptable

# Connection Settings
max_connections = 100                   # Adjust based on your needs
```

## Monitoring

1. Install monitoring tools:
```bash
sudo apt install postgresql-contrib
```

2. Enable monitoring extensions:
```sql
CREATE EXTENSION pg_stat_statements;
CREATE EXTENSION pg_buffercache;
```

3. Configure monitoring queries in your application's health check endpoint.

## Troubleshooting

1. View PostgreSQL logs:
```bash
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

2. Check connection issues:
```bash
sudo netstat -nlp | grep postgres
```

3. Test SSL connection:
```bash
psql "postgresql://app_user:your_secure_password@localhost:5432/business_solution?sslmode=verify-full"
```

## Maintenance

1. Regular vacuum:
```sql
VACUUM ANALYZE;
```

2. Index maintenance:
```sql
REINDEX DATABASE business_solution;
```

3. Monitor database size:
```sql
SELECT pg_size_pretty(pg_database_size('business_solution'));
```

## Next Steps

1. Update your application's `.env` file with the PostgreSQL connection string
2. Run database migrations
3. Test the application's database connectivity
4. Monitor the application logs for any database-related issues

For additional security and performance tuning, consult the [PostgreSQL documentation](https://www.postgresql.org/docs/). 