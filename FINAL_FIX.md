# Final Fix: DATABASE_URL Empty Error

## Problem
`DATABASE_URL` is resolving to an empty string, causing Prisma to fail.

## Root Cause
Your password `solarsecure@2025#` contains special characters that break URL parsing when auto-constructed by docker-compose.

## Solution

You **MUST** set `DATABASE_URL` explicitly in your `.env` file with URL-encoded password.

### Edit Your .env File

```bash
nano .env
```

Add this line (with URL-encoded password):

```env
# URL-encoded password: @ = %40, # = %23
DATABASE_URL=postgresql://solarsync:solarsecure%402025%23@postgres:5432/solarsync_db?schema=public
```

### Complete .env Example

```env
POSTGRES_USER=solarsync
POSTGRES_PASSWORD=solarsecure@2025#
POSTGRES_DB=solarsync_db
POSTGRES_PORT=5432

# REQUIRED: Set DATABASE_URL with URL-encoded password
DATABASE_URL=postgresql://solarsync:solarsecure%402025%23@postgres:5432/solarsync_db?schema=public

NODE_ENV=production
BACKEND_PORT=5000
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_min_32_chars
JWT_EXPIRES_IN=7d

FRONTEND_PORT=8080
VITE_API_BASE_URL=https://crm.singhjitech.com/api
VITE_SOCKET_URL=https://crm.singhjitech.com
FRONTEND_URL=https://crm.singhjitech.com
```

### Restart Containers

```bash
docker compose down
docker compose up -d
```

## Why This Is Needed

Docker Compose's variable substitution cannot properly handle special characters in passwords when constructing URLs. The `@` and `#` characters have special meaning in URLs:
- `@` separates credentials from host
- `#` starts a URL fragment/comment

By explicitly setting `DATABASE_URL` with URL-encoded password, we avoid these parsing issues.

## Verify It Works

```bash
# Check backend logs
docker compose logs backend | tail -20

# Should show successful database connection and migrations
```

