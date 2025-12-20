# Docker Deployment - Quick Reference

## 🚀 Quick Start

1. **Copy environment file:**
   ```bash
   cp env.docker.example .env
   ```

2. **Edit `.env` file with your values** (especially `JWT_SECRET`, `POSTGRES_PASSWORD`)

3. **For single domain (crm.singhjitech.com):**
   - See `DEPLOYMENT_SINGLE_DOMAIN.md` for complete setup with SSL

4. **Build and start:**
   ```bash
   docker compose up -d --build
   ```

5. **Check logs:**
   ```bash
   docker compose logs -f
   ```

6. **Access:**
   - Single domain setup: https://crm.singhjitech.com
   - Direct access: http://your-server-ip:80

## 📋 Common Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Restart a service
docker compose restart backend

# Rebuild after code changes
docker compose up -d --build

# Run database migrations manually
docker compose exec backend npx prisma migrate deploy
```

## 🔧 Troubleshooting

- **Port already in use?** Change ports in `.env` file
- **Database connection error?** Check `DATABASE_URL` in `.env`
- **Frontend not connecting?** Check `VITE_API_BASE_URL` and rebuild frontend

See `DEPLOYMENT.md` for detailed instructions.

