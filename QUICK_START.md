# Quick Start Guide - crm.singhjitech.com

## 🚀 Fastest Deployment Path

### Step 1: Setup Environment

```bash
# Copy environment file
cp env.docker.example .env

# Edit .env - IMPORTANT: Change these values:
nano .env
```

**Required changes in `.env`:**
- `JWT_SECRET` - Generate a secure random string (32+ characters)
- `POSTGRES_PASSWORD` - Use a strong password

**Already configured correctly:**
- `VITE_API_BASE_URL=https://crm.singhjitech.com/api`
- `VITE_SOCKET_URL=https://crm.singhjitech.com`
- `FRONTEND_URL=https://crm.singhjitech.com`

### Step 2: Build Docker Containers

```bash
docker compose up -d --build
```

### Step 3: Setup SSL with Nginx (on host)

```bash
# Install Nginx and Certbot
sudo apt install nginx certbot python3-certbot-nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/crm.singhjitech.com
```

Paste this configuration (or copy from `nginx.host.conf`):

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

    ssl_certificate /etc/letsencrypt/live/crm.singhjitech.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/crm.singhjitech.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    client_max_body_size 50M;

    # IMPORTANT: Proxy to localhost:8080 (frontend container)
    # The frontend container's nginx (nginx.conf) handles routing to backend
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

**Note:** Do NOT use Docker service names (like `backend:5000`) in the host nginx config. Only use `localhost:80` to proxy to the frontend container.

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/crm.singhjitech.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d crm.singhjitech.com
```

### Step 4: Verify

- Frontend: https://crm.singhjitech.com
- API: https://crm.singhjitech.com/api/health
- Socket.IO: Automatically connected at https://crm.singhjitech.com/socket.io/

## 📝 Important Notes

1. **DNS**: Make sure `crm.singhjitech.com` points to your server IP
2. **Firewall**: Open ports 80 and 443
3. **First Run**: Database migrations run automatically
4. **Rebuild Frontend**: If you change environment variables, rebuild:
   ```bash
   docker compose up -d --build frontend
   ```

## 🔍 Check Status

```bash
# Check containers
docker compose ps

# View logs
docker compose logs -f

# Test backend
curl http://localhost:5000/health
```

For detailed instructions, see `DEPLOYMENT_SINGLE_DOMAIN.md`

