# Fix: Database URL Password Encoding

## Problem

Prisma is showing: `database "postgres", schema "public" at "2025"`

This means your password `solarsecure@2025#` contains special characters that need to be URL-encoded in the DATABASE_URL.

## Solution

Your password `solarsecure@2025#` contains:
- `@` which needs to be encoded as `%40`
- `#` which needs to be encoded as `%23`

So `solarsecure@2025#` becomes `solarsecure%402025%23`

## Fix Your .env File

Edit your `.env` file and add this line:

```env
# URL-encoded password: @ = %40, # = %23
DATABASE_URL=postgresql://solarsync:solarsecure%402025%23@postgres:5432/solarsync_db?schema=public
```

## Complete .env Example

```env
POSTGRES_USER=solarsync
POSTGRES_PASSWORD=solarsecure@2025#
POSTGRES_DB=solarsync_db
POSTGRES_PORT=5432

# Explicitly set DATABASE_URL with URL-encoded password
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

## Restart Containers

```bash
docker compose down
docker compose up -d
```

## URL Encoding Reference

Common special characters that need encoding:
- `@` = `%40`
- `#` = `%23`
- `%` = `%25`
- `&` = `%26`
- `+` = `%2B`
- space = `%20`
- `/` = `%2F`
- `?` = `%3F`
- `=` = `%3D`

## Verify It Works

```bash
# Check backend logs
docker compose logs backend | tail -20

# Should now show correct database connection
```

