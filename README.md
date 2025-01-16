# Cloud1604 Business Solution

A comprehensive business management solution for inventory, sales, and finance management.

## Features

- User Management with Role-Based Access Control
- Inventory Management
- Sales Management (Quotations & Orders)
- Finance Management (Invoices & Payments)
- Real-time Dashboard
- Reporting & Analytics
- Monitoring & Logging

## Installation Options

Choose the installation method that best suits your needs:

1. [Oracle Cloud Installation](docs/ORACLE-CLOUD.md) (Recommended for Production)
   - Automated installation script
   - Production-ready configuration
   - Built-in monitoring and backups
   - SSL/TLS support

2. [Docker Installation](docs/DOCKER.md) (Recommended for Development)
   - Quick setup with Docker Compose
   - Isolated environment
   - Easy updates and rollbacks
   - Perfect for development and testing

3. [Manual Installation](docs/INSTALL.md) (Advanced Users)
   - Step-by-step installation process
   - Full control over configuration
   - Customizable setup
   - Suitable for custom environments

## Quick Start

### Oracle Cloud (Production)

```bash
git clone https://github.com/Black1604/business-solution.git
cd business-solution
chmod +x scripts/install-oracle.sh
sudo ./scripts/install-oracle.sh
```

### Docker (Development)

```bash
git clone https://github.com/Black1604/business-solution.git
cd business-solution
cp .env.docker.example .env
docker-compose up -d
```

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, Radix UI
- **Backend**: Node.js, PostgreSQL, Redis
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **Process Manager**: PM2
- **Monitoring**: Prometheus & Grafana
- **Containerization**: Docker & Docker Compose

## Documentation

- [Installation Guide](docs/INSTALL.md) - Detailed installation instructions
- [Oracle Cloud Guide](docs/ORACLE-CLOUD.md) - Oracle Cloud deployment
- [Docker Guide](docs/DOCKER.md) - Docker installation and management
- [Development Guide](docs/DEVELOPMENT.md) - Setting up development environment
- [API Documentation](docs/API.md) - API endpoints and usage
- [User Guide](docs/USER-GUIDE.md) - Application usage instructions
- [Security Guide](docs/SECURITY.md) - Security best practices
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions

## Development

1. Clone the repository:
```bash
git clone https://github.com/Black1604/business-solution.git
cd business-solution
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment:
```bash
cp .env.example .env
```

4. Start development server:
```bash
npm run dev
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for detailed guidelines.

## Support

- Documentation: https://github.com/Black1604/business-solution/docs
- Issues: https://github.com/Black1604/business-solution/issues
- Email: support@cloud1604.com

## Security

For security issues, please email security@cloud1604.com

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
#   b u s i n e s s - s o l u t i o n 
 
 