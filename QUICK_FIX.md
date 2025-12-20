# Quick Fix: Host Nginx Configuration

## Problem
Error: `host not found in upstream "backend:5000"`

This happens because you put the Docker container nginx configuration (`nginx.conf`) into the host nginx configuration. The host nginx doesn't know about Docker container names.

## Solution

The host nginx should **ONLY** proxy to `localhost:80` (the frontend container). The frontend container's nginx handles routing to the backend.

### Correct Host Nginx Configuration

```bash
# Edit the host nginx config
sudo nano /etc/nginx/sites-available/crm.singhjitech.com
```

**For initial setup (BEFORE SSL certificate):** Use this simple HTTP-only configuration:

```nginx
# HTTP Server (before SSL)
server {
    listen 80;
    server_name crm.singhjitech.com;

    # Allow Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Proxy to Docker frontend container (default port 8080)
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

    client_max_body_size 50M;
}
```

### Test and Reload

```bash
# Test configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

### After SSL Certificate is Installed

Once you run `sudo certbot --nginx -d crm.singhjitech.com`, Certbot will automatically:
1. Add the HTTPS server block
2. Configure SSL certificates
3. Add redirect from HTTP to HTTPS

You don't need to manually configure HTTPS - Certbot does it for you!

## Architecture Explanation

```
Internet (HTTP initially, HTTPS after certbot)
   ↓
[Host Nginx :80 or :443] ← SSL termination (after certbot)
   ↓ (proxies to localhost:80)
[Docker Frontend Container :80] ← Uses nginx.conf (has backend routing)
   ├─ /api/* → Backend:5000 (Docker network)
   ├─ /socket.io/* → Backend:5000 (Docker network)
   └─ /* → Static files
```

**Key Point:** 
- Host nginx: Only knows about `localhost:80`
- Docker nginx: Knows about `backend:5000` (Docker service name)

## Step-by-Step Deployment

1. **Use HTTP-only config above** (no SSL blocks)
2. **Test and reload nginx:** `sudo nginx -t && sudo systemctl reload nginx`
3. **Start Docker containers:** `docker compose up -d --build`
4. **Verify HTTP works:** `curl http://crm.singhjitech.com/health`
5. **Install SSL:** `sudo certbot --nginx -d crm.singhjitech.com`
6. **Certbot automatically updates config** with HTTPS
