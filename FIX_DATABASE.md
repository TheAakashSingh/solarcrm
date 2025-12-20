# Fix: Database "solarsync" does not exist

## Problem
The backend is trying to connect to database "solarsync" but it doesn't exist. The database should be "solarsync_db".

## Root Cause
Your `.env` file likely has incorrect database name configuration.

## Solution

### Check Your .env File

```bash
# On your server, check the database settings
cat .env | grep -E "POSTGRES_DB|DATABASE_URL"
```

### Fix Option 1: Correct POSTGRES_DB (Recommended)

Make sure your `.env` file has:

```env
POSTGRES_DB=solarsync_db
```

NOT:
```env
POSTGRES_DB=solarsync  # ❌ Wrong - this is the user name, not database name
```

### Fix Option 2: If Using Custom DATABASE_URL

If you're using a custom `DATABASE_URL`, make sure it uses the correct database name:

```env
DATABASE_URL=postgresql://solarsync:your_password@postgres:5432/solarsync_db?schema=public
```

NOT:
```env
DATABASE_URL=postgresql://solarsync:your_password@postgres:5432/solarsync?schema=public  # ❌ Wrong database name
```

### Restart Containers

After fixing the `.env` file:

```bash
# Stop containers
docker compose down

# Remove the database volume (if you want to start fresh)
# WARNING: This will delete all data!
docker volume rm solarcrm_postgres_data

# Start again (database will be created with correct name)
docker compose up -d --build
```

### Verify Database Was Created

```bash
# Check database exists
docker compose exec postgres psql -U solarsync -c "\l" | grep solarsync_db

# Or connect to database
docker compose exec postgres psql -U solarsync -d solarsync_db -c "SELECT version();"
```

## Summary

The issue is a mismatch between:
- **POSTGRES_USER**: `solarsync` (this is correct - the database user)
- **POSTGRES_DB**: Should be `solarsync_db` (not `solarsync`)

The database name must match in both:
1. `POSTGRES_DB` environment variable (or `DATABASE_URL`)
2. The database name in your connection string

