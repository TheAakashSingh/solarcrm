# Debug: Database Connection Issue

Your `.env` file looks correct, but the backend is still trying to connect to "solarsync" instead of "solarsync_db".

## Possible Causes

1. **Old database volume exists** - The database might have been created with the wrong name initially
2. **Backend container cached environment** - The container might be using old environment variables
3. **DATABASE_URL not being read correctly** - Variable substitution issue

## Debugging Steps

### Step 1: Check What Database URL Backend Is Using

```bash
# Check backend container's environment
docker compose exec backend env | grep DATABASE_URL

# Check backend container logs
docker compose logs backend | tail -20
```

### Step 2: Verify Database Was Created Correctly

```bash
# Check what databases exist in PostgreSQL
docker compose exec postgres psql -U solarsync -c "\l"
```

### Step 3: Force Recreate Containers

```bash
# Stop and remove containers
docker compose down

# Remove old volumes (WARNING: deletes data)
docker volume rm solarcrm_postgres_data

# Rebuild and start fresh
docker compose up -d --build
```

### Step 4: Explicitly Set DATABASE_URL in docker-compose.yml

If the variable substitution isn't working, we can explicitly set it. But first, let's check if the backend is reading from a different source.

## Quick Test

Run this to see what DATABASE_URL the backend container actually has:

```bash
docker compose exec backend printenv DATABASE_URL
```

This will show us if the DATABASE_URL is being set correctly or if there's a mismatch.

