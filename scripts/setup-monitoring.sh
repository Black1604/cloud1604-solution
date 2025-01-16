#!/bin/bash

# Exit on error
set -e

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Check if script is run as root
if [ "$EUID" -ne 0 ]; then
    log "Please run as root"
    exit 1
fi

# Install Prometheus
log "Installing Prometheus..."
apt install -y prometheus

# Configure Prometheus
log "Configuring Prometheus..."
cat > /etc/prometheus/prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'postgresql'
    static_configs:
      - targets: ['localhost:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']
EOF

# Start and enable Prometheus
log "Starting Prometheus service..."
systemctl start prometheus
systemctl enable prometheus

# Install Grafana
log "Installing Grafana..."
apt install -y software-properties-common
add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
wget -q -O - https://packages.grafana.com/gpg.key | apt-key add -
apt update
apt install -y grafana

# Configure Grafana
log "Configuring Grafana..."
cat > /etc/grafana/grafana.ini << EOF
[server]
http_port = 3000
domain = localhost

[security]
admin_user = admin
admin_password = temp_password

[auth.anonymous]
enabled = false

[analytics]
reporting_enabled = false
check_for_updates = true

[log]
mode = file
level = info
EOF

# Start and enable Grafana
log "Starting Grafana service..."
systemctl start grafana-server
systemctl enable grafana-server

# Install exporters
log "Installing exporters..."
apt install -y prometheus-node-exporter
systemctl start prometheus-node-exporter
systemctl enable prometheus-node-exporter

# Install PostgreSQL exporter
wget https://github.com/prometheus-community/postgres_exporter/releases/download/v0.11.1/postgres_exporter-0.11.1.linux-amd64.tar.gz
tar xvf postgres_exporter-*.tar.gz
mv postgres_exporter-*.linux-amd64/postgres_exporter /usr/local/bin/
rm -rf postgres_exporter-*

# Create PostgreSQL exporter service
cat > /etc/systemd/system/postgres_exporter.service << EOF
[Unit]
Description=Prometheus PostgreSQL Exporter
After=network.target

[Service]
Type=simple
User=postgres
Environment="DATA_SOURCE_NAME=user=postgres host=/var/run/postgresql/ sslmode=disable"
ExecStart=/usr/local/bin/postgres_exporter
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Install Redis exporter
wget https://github.com/oliver006/redis_exporter/releases/download/v1.44.0/redis_exporter-v1.44.0.linux-amd64.tar.gz
tar xvf redis_exporter-*.tar.gz
mv redis_exporter-*.linux-amd64/redis_exporter /usr/local/bin/
rm -rf redis_exporter-*

# Create Redis exporter service
cat > /etc/systemd/system/redis_exporter.service << EOF
[Unit]
Description=Prometheus Redis Exporter
After=network.target

[Service]
Type=simple
Environment="REDIS_ADDR=redis://localhost:6379"
Environment="REDIS_PASSWORD=temp_password"
ExecStart=/usr/local/bin/redis_exporter
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Start exporters
log "Starting exporters..."
systemctl daemon-reload
systemctl start postgres_exporter
systemctl enable postgres_exporter
systemctl start redis_exporter
systemctl enable redis_exporter

# Verify services
log "Verifying services..."
systemctl status prometheus --no-pager
systemctl status grafana-server --no-pager
systemctl status prometheus-node-exporter --no-pager
systemctl status postgres_exporter --no-pager
systemctl status redis_exporter --no-pager

# Final steps
log "Monitoring setup completed successfully!"
log "Access Grafana at: http://your-server:3000"
log "Default credentials:"
log "Username: admin"
log "Password: temp_password"
log "IMPORTANT: Change the Grafana admin password after first login"
log "Configure your firewall to allow access to ports: 3000 (Grafana), 9090 (Prometheus)" 