# Fix: Port 80 Already in Use

## Problem
Docker is trying to bind to port 80, but it's already in use (likely by host nginx).

## Solution

### Option 1: Stop and Remove Old Containers (Recommended)

```bash
# Stop all containers
docker compose down

# Remove old containers (if they exist)
docker ps -a | grep solarsync-frontend
docker rm -f solarsync-frontend 2>/dev/null || true

# Check what's using port 80
sudo lsof -i :80

# Start with new configuration (port 8080)
docker compose up -d --build
```

### Option 2: Check Your .env File

Make sure your `.env` file has:
```env
FRONTEND_PORT=8080
```

NOT:
```env
FRONTEND_PORT=80  # ❌ This will conflict with host nginx
```

### Option 3: Update Host Nginx Config

After containers are running on port 8080, update your host nginx to proxy to port 8080:

```bash
sudo nano /etc/nginx/sites-available/crm.singhjitech.com
```

Change:
```nginx
proxy_pass http://localhost:8080;  # ✅ Correct
```

NOT:
```nginx
proxy_pass http://localhost:80;  # ❌ Wrong
```

Then:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Verify

```bash
# Check containers are running
docker compose ps

# Check frontend is on port 8080
docker compose port frontend 80

# Test
curl http://localhost:8080/health
```

