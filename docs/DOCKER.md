# Docker Installation Guide

This guide provides instructions for running Cloud1604 Business Solution using Docker.

## Prerequisites

1. System Requirements:
   - Docker Engine 20.10+
   - Docker Compose 2.0+
   - 2GB RAM minimum
   - 20GB storage minimum

2. Network Requirements:
   - Port 80/443 for HTTP/HTTPS
   - Port 5432 for PostgreSQL (optional)
   - Port 6379 for Redis (optional)

## Quick Installation

1. Clone the repository:
```bash
git clone https://github.com/Black1604/business-solution.git
cd business-solution
```

2. Create environment file:
```bash
cp .env.docker.example .env
```

3. Start the application:
```bash
docker-compose up -d
```

The application will be available at http://localhost:3000

## Configuration

### Environment Variables

Edit `.env` file to configure:
- Database credentials
- Redis settings
- Application secrets
- Email settings
- Storage paths

### Persistent Storage

Data is stored in Docker volumes:
- `postgres_data`: Database files
- `redis_data`: Redis data
- `app_uploads`: User uploads
- `app_backups`: Backup files

## Container Management

1. View container status:
```bash
docker-compose ps
```

2. View logs:
```bash
docker-compose logs -f
```

3. Restart services:
```bash
docker-compose restart
```

4. Stop application:
```bash
docker-compose down
```

## Updating

1. Pull latest changes:
```bash
git pull origin main
```

2. Rebuild containers:
```bash
docker-compose build
```

3. Update and restart:
```bash
docker-compose up -d
```

## Backup and Restore

1. Backup database:
```bash
docker-compose exec postgres pg_dump -U app_user business_solution > backup.sql
```

2. Restore database:
```bash
cat backup.sql | docker-compose exec -T postgres psql -U app_user business_solution
```

## Production Deployment

For production environments:

1. Use production configuration:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

2. Enable SSL:
- Update Nginx configuration
- Add SSL certificates
- Configure reverse proxy

## Monitoring

1. View container metrics:
```bash
docker stats
```

2. Access monitoring dashboard:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000/grafana

## Troubleshooting

1. Container issues:
```bash
docker-compose logs [service_name]
```

2. Database connection:
```bash
docker-compose exec postgres psql -U app_user business_solution
```

3. Redis connection:
```bash
docker-compose exec redis redis-cli
```

## Security Best Practices

1. Use secure passwords in `.env`
2. Regularly update images
3. Limit container privileges
4. Enable Docker security features
5. Monitor container logs

## Support

- Documentation: https://github.com/Black1604/business-solution/docs
- Issues: https://github.com/Black1604/business-solution/issues
- Email: support@cloud1604.com 