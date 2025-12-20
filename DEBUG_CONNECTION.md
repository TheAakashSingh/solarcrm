# Debug: Why is it trying to connect to database "solarsync"?

## The Error
`database "solarsync" does not exist`

This means something is trying to connect without specifying the database name, so PostgreSQL defaults to using the username as the database name.

## Debug Steps

### 1. Check what DATABASE_URL the backend container actually has:

```bash
docker compose exec backend printenv DATABASE_URL
```

### 2. Check all database-related environment variables:

```bash
docker compose exec backend printenv | grep -E "DATABASE|POSTGRES"
```

### 3. Verify your .env file has DATABASE_URL set:

```bash
cat .env | grep DATABASE_URL
```

It should show:
```
DATABASE_URL=postgresql://solarsync:solarsecure%402025%23@postgres:5432/solarsync_db?schema=public
```

### 4. Check if the URL is being parsed correctly:

```bash
docker compose exec backend node -e "console.log(process.env.DATABASE_URL)"
```

## Common Issues

### Issue 1: DATABASE_URL not set in .env
**Solution:** Make sure you have this line in `.env`:
```env
DATABASE_URL=postgresql://solarsync:solarsecure%402025%23@postgres:5432/solarsync_db?schema=public
```

### Issue 2: URL encoding not working
If the `%40` and `%23` aren't being preserved, try escaping differently or use a simpler password for testing.

### Issue 3: Docker Compose not reading .env
Make sure:
- The `.env` file is in the same directory as `docker-compose.yml`
- You're running `docker compose` from that directory
- The file is named exactly `.env` (not `.env.local` or similar)

## Quick Test

Run these commands to see what's actually being used:

```bash
# Stop containers
docker compose down

# Check .env file
cat .env

# Start and check environment
docker compose up -d backend
docker compose exec backend printenv DATABASE_URL
```

If DATABASE_URL is empty or malformed, that's the issue.

