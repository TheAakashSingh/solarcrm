# Docker Deployment Guide - SolarSync CRM

This guide will help you deploy the SolarSync CRM application using Docker and Docker Compose on your VPS server.

> **Note:** If you're using a single domain (like `crm.singhjitech.com`), see `DEPLOYMENT_SINGLE_DOMAIN.md` for specific instructions.

## Prerequisites

- VPS server with Ubuntu/Debian (or similar Linux distribution)
- Docker installed (version 20.10 or higher)
- Docker Compose installed (version 2.0 or higher)
- Domain name (optional, for SSL/HTTPS)
- Basic knowledge of Linux commands

## Quick Start

### 1. Install Docker and Docker Compose

```bash
# Update package index
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### 2. Clone/Upload Your Project

```bash
# If using git
git clone <your-repo-url> solarsync-crm
cd solarsync-crm

# Or upload your project files to the server using SCP/FTP
```

### 3. Configure Environment Variables

```bash
# Copy the example environment file
cp env.docker.example .env

# Edit the environment file
nano .env
```

**Important variables to configure:**

```env
# Database
POSTGRES_USER=solarsync
POSTGRES_PASSWORD=change_this_secure_password
POSTGRES_DB=solarsync_db

# JWT Secret (generate a secure random string)
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long

# Frontend API URLs (use your server IP or domain)
VITE_API_BASE_URL=http://your-server-ip:5000/api
VITE_SOCKET_URL=http://your-server-ip:5000
FRONTEND_URL=http://your-server-ip:80
```

### 4. Build and Start Services

```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f

# Check status
docker compose ps
```

### 5. Run Database Migrations

```bash
# Migrations should run automatically, but if needed:
docker compose exec backend npx prisma migrate deploy

# Seed database (optional - only for initial setup)
docker compose exec backend npm run prisma:seed
```

### 6. Access the Application

- **Frontend**: http://your-server-ip:80
- **Backend API**: http://your-server-ip:5000/api
- **Health Check**: http://your-server-ip:5000/api/health

## Production Configuration

### Using a Domain with Nginx Reverse Proxy (Recommended)

1. Install Nginx on your server:

```bash
sudo apt install nginx
```

2. Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/solarsync
```

Add this configuration:

```nginx
# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/solarsync /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

4. Install SSL with Certbot:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

5. Update `.env` file:

```env
VITE_API_BASE_URL=https://api.yourdomain.com/api
VITE_SOCKET_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

6. Rebuild frontend:

```bash
docker compose up -d --build frontend
```

### Using External Database

If you're using an external PostgreSQL database, update the `.env` file:

```env
# Comment out or remove POSTGRES_* variables
# POSTGRES_USER=solarsync
# POSTGRES_PASSWORD=password
# POSTGRES_DB=solarsync_db

# Use external database URL
DATABASE_URL=postgresql://username:password@external-host:5432/database_name?schema=public
```

And remove the `postgres` service from `docker-compose.yml`:

```yaml
services:
  # Remove or comment out postgres service
  # postgres:
  #   ...
  
  backend:
    depends_on:
      # Remove postgres dependency
      # postgres:
      #   condition: service_healthy
```

## Docker Commands

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

### Stop Services

```bash
# Stop all services
docker compose down

# Stop and remove volumes (WARNING: deletes database data)
docker compose down -v
```

### Restart Services

```bash
# Restart all services
docker compose restart

# Restart specific service
docker compose restart backend
```

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose up -d --build

# Run migrations if needed
docker compose exec backend npx prisma migrate deploy
```

### Access Container Shell

```bash
# Backend container
docker compose exec backend sh

# Frontend container
docker compose exec frontend sh

# Database container
docker compose exec postgres psql -U solarsync -d solarsync_db
```

### Database Backup

```bash
# Create backup
docker compose exec postgres pg_dump -U solarsync solarsync_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker compose exec -T postgres psql -U solarsync solarsync_db < backup_file.sql
```

## Troubleshooting

### Check Container Status

```bash
docker compose ps
```

### Check Container Logs

```bash
docker compose logs backend
docker compose logs frontend
```

### Database Connection Issues

```bash
# Check if database is running
docker compose ps postgres

# Check database logs
docker compose logs postgres

# Test connection from backend container
docker compose exec backend node -e "console.log(process.env.DATABASE_URL)"
```

### Port Already in Use

If ports 80, 5000, or 5432 are already in use:

1. Update `.env` file with different ports
2. Or stop the conflicting service:

```bash
# Find process using port
sudo lsof -i :80
sudo lsof -i :5000

# Stop the process or update docker-compose.yml ports
```

### Frontend Not Connecting to Backend

1. Check `VITE_API_BASE_URL` and `VITE_SOCKET_URL` in `.env`
2. Rebuild frontend: `docker compose up -d --build frontend`
3. Check browser console for errors
4. Verify CORS settings in backend

### Reset Everything

```bash
# Stop and remove all containers, networks, and volumes
docker compose down -v

# Remove images (optional)
docker compose down --rmi all

# Start fresh
docker compose up -d --build
```

## Security Best Practices

1. **Change Default Passwords**: Update `POSTGRES_PASSWORD` and `JWT_SECRET`
2. **Use Strong JWT Secret**: Generate a random 32+ character string
3. **Enable Firewall**: Only allow necessary ports (80, 443, 22)
4. **Use HTTPS**: Always use SSL/TLS in production
5. **Regular Updates**: Keep Docker images and system updated
6. **Backup Database**: Set up regular database backups
7. **Monitor Logs**: Regularly check logs for errors and security issues

## Performance Optimization

### Resource Limits

Add resource limits to `docker-compose.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### Database Optimization

Consider adjusting PostgreSQL settings in `docker-compose.yml`:

```yaml
postgres:
  command:
    - "postgres"
    - "-c"
    - "shared_buffers=256MB"
    - "-c"
    - "max_connections=200"
```

## Support

For issues or questions, please check:
- Application logs: `docker compose logs`
- Docker logs: `docker logs <container-name>`
- GitHub issues (if applicable)

## Additional Notes

- The frontend is built at container build time, so environment variables must be set before building
- Database migrations run automatically on backend startup
- File uploads are stored in `./backend/uploads` (make sure this directory exists and has proper permissions)
- Logs are stored in `./backend/logs` (if you implement logging)

