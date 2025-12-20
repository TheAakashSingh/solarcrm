# Single Domain Deployment Guide - crm.singhjitech.com

This guide is specifically for deploying using a single domain `crm.singhjitech.com` for both frontend and backend.

## Architecture

With a single domain, the setup works as follows:

- **Frontend**: Served at `https://crm.singhjitech.com/` (root)
- **Backend API**: Proxied at `https://crm.singhjitech.com/api/*`
- **Socket.IO**: Proxied at `https://crm.singhjitech.com/socket.io/*`

All routing is handled by Nginx in the frontend container, which acts as a reverse proxy.

## Prerequisites

1. Domain `crm.singhjitech.com` pointing to your VPS server IP
2. Docker and Docker Compose installed
3. Ports 80 and 443 open in firewall
4. SSL certificate (we'll use Let's Encrypt with Certbot)

## Step-by-Step Deployment

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

### 2. Upload Your Project

```bash
# Clone or upload your project
cd ~
git clone <your-repo-url> solarsync-crm
cd solarsync-crm
```

### 3. Configure Environment Variables

```bash
# Copy the example environment file
cp env.docker.example .env

# Edit the environment file
nano .env
```

**Update these values in `.env`:**

```env
# Database
POSTGRES_USER=solarsync
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=solarsync_db

# JWT Secret (generate a secure random string)
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long

# Domain Configuration (already set correctly)
VITE_API_BASE_URL=https://crm.singhjitech.com/api
VITE_SOCKET_URL=https://crm.singhjitech.com
FRONTEND_URL=https://crm.singhjitech.com
```

### 4. Install Nginx on Host (for SSL Termination)

```bash
# Install Nginx
sudo apt install nginx

# Stop default nginx (we'll use Docker nginx for internal routing)
sudo systemctl stop nginx
sudo systemctl disable nginx
```

### 5. Configure Nginx Reverse Proxy with SSL

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/crm.singhjitech.com
```

**IMPORTANT:** The host nginx should ONLY proxy to the Docker frontend container. Do NOT try to use Docker service names like `backend:5000` - those only work inside Docker containers.

Copy this configuration (or see `nginx.host.conf` file in your project):

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name crm.singhjitech.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name crm.singhjitech.com;

    # SSL Configuration (will be updated by Certbot)
    ssl_certificate /etc/letsencrypt/live/crm.singhjitech.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/crm.singhjitech.com/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Client body size (for file uploads)
    client_max_body_size 50M;

    # Proxy to Docker frontend container on localhost:80
    # The frontend container's nginx (nginx.conf) handles routing to backend
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket support
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/crm.singhjitech.com /etc/nginx/sites-enabled/
sudo nginx -t
```

### 6. Install SSL Certificate with Certbot

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Create directory for ACME challenge
sudo mkdir -p /var/www/certbot

# Get SSL certificate (follow prompts)
sudo certbot --nginx -d crm.singhjitech.com

# Test automatic renewal
sudo certbot renew --dry-run
```

### 7. Start Docker Services

```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f

# Check status
docker compose ps
```

### 8. Run Database Migrations

```bash
# Migrations should run automatically, but if needed:
docker compose exec backend npx prisma migrate deploy

# Seed database (optional - only for initial setup)
docker compose exec backend npm run prisma:seed
```

### 9. Verify Deployment

Access your application:
- **Frontend**: https://crm.singhjitech.com
- **API Health**: https://crm.singhjitech.com/health
- **API Endpoint**: https://crm.singhjitech.com/api/health

## Troubleshooting

### Check Nginx Logs

```bash
# Host Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Docker container logs
docker compose logs frontend
docker compose logs backend
```

### Test Internal Connectivity

```bash
# Test if Docker containers can communicate
docker compose exec frontend wget -O- http://backend:5000/health

# Test if host nginx can reach Docker
curl http://localhost:80/health
```

### Common Issues

1. **502 Bad Gateway**: 
   - Check if Docker containers are running: `docker compose ps`
   - Check if port 80 is accessible: `curl http://localhost:80`
   - Check Docker logs: `docker compose logs frontend`

2. **SSL Certificate Issues**:
   - Verify DNS: `nslookup crm.singhjitech.com`
   - Check certificate: `sudo certbot certificates`
   - Renew if needed: `sudo certbot renew`

3. **API Not Working**:
   - Check backend logs: `docker compose logs backend`
   - Verify DATABASE_URL in `.env`
   - Test backend directly: `docker compose exec backend curl http://localhost:5000/health`

4. **Socket.IO Not Connecting**:
   - Check browser console for WebSocket errors
   - Verify `VITE_SOCKET_URL` is set correctly
   - Check nginx WebSocket configuration

## Maintenance Commands

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose up -d --build

# Run migrations if needed
docker compose exec backend npx prisma migrate deploy
```

### Backup Database

```bash
# Create backup
docker compose exec postgres pg_dump -U solarsync solarsync_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker compose exec -T postgres psql -U solarsync solarsync_db < backup_file.sql
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

### Restart Services

```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart backend
```

## Security Checklist

- [x] Strong `JWT_SECRET` set in `.env`
- [x] Strong `POSTGRES_PASSWORD` set in `.env`
- [x] SSL certificate installed and auto-renewing
- [x] Firewall configured (ports 80, 443, 22 only)
- [x] Database not exposed to public
- [x] Backend not directly accessible (only via nginx)
- [x] Regular backups configured
- [x] Security headers in place

## Notes

- The frontend container's nginx handles internal routing (API, Socket.IO, static files)
- The host nginx handles SSL termination and proxies to the Docker network
- All API requests from the frontend go to `/api/*` which is proxied to the backend
- Socket.IO connections go to `/socket.io/*` which is proxied with WebSocket support
- The backend container is not directly exposed to the internet for security

