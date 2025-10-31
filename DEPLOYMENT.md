# Deployment Guide

This document outlines how to deploy the MaFrance application to production.

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Domain name (for production)

## Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone https://github.com/RemiG1984/MaFrance.git
   cd MaFrance
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your production values
   ```

3. **Run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Check health**
   ```bash
   curl http://localhost:3000/api/health
   ```

## Production Deployment

### With Nginx (Recommended)

1. **Update docker-compose.yml** to include nginx profile:
   ```bash
   docker-compose --profile production up -d
   ```

2. **Configure SSL** (Let's Encrypt recommended):
   ```bash
   # Install certbot
   sudo apt install certbot

   # Get SSL certificate
   sudo certbot certonly --webroot -w /var/www/html -d yourdomain.com
   ```

3. **Update nginx.conf** with your domain and SSL paths

### Environment Variables

See `.env.example` for all required configuration options.

### Database Setup

The application uses SQLite. The database file will be created automatically on first run in the `./.data/` directory.

### Backup Strategy

```bash
# Backup database
cp ./.data/france.db ./.data/france.db.backup

# Backup with timestamp
cp ./.data/france.db ./.data/france-$(date +%Y%m%d-%H%M%S).db
```

## Monitoring

### Health Checks

- **Application Health**: `GET /api/health`
- **Database Connectivity**: Included in health check
- **Uptime**: Included in health response

### Logs

- **Application Logs**: Check Docker container logs
- **Nginx Logs**: `/var/log/nginx/`
- **Database Logs**: Enabled with `ENABLE_SQL_LOGGING=true`

## Scaling

### Horizontal Scaling

For high traffic, consider:
- Load balancer in front of multiple app instances
- Redis for session storage (if needed)
- CDN for static assets

### Database Optimization

- Enable WAL mode for SQLite: `PRAGMA journal_mode=WAL;`
- Regular VACUUM operations
- Connection pooling (if moving to PostgreSQL)

## Security Checklist

- [ ] SSL/TLS enabled
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Rate limiting active
- [ ] Environment variables not exposed
- [ ] Database file permissions correct
- [ ] Regular dependency updates (Dependabot)
- [ ] Security scanning enabled

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Find process using port 3000
   lsof -i :3000
   # Kill the process
   kill -9 <PID>
   ```

2. **Database locked**
   ```bash
   # Check for long-running queries
   # Restart the application
   docker-compose restart
   ```

3. **Out of memory**
   ```bash
   # Increase Docker memory limit
   # Or optimize application memory usage
   ```

### Logs and Debugging

```bash
# View application logs
docker-compose logs mafrance

# View nginx logs
docker-compose logs nginx

# Enter container for debugging
docker-compose exec mafrance sh
```