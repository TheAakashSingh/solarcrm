# Reset Database and Re-seed with User Roles Only

## Steps to Clear Database and Re-seed

### Option 1: Reset Database (Docker) - Recommended

This will completely reset your database and re-run migrations and seed:

```bash
# Stop containers
docker compose down

# Remove the database volume (WARNING: This deletes ALL data)
docker volume rm solarcrm_postgres_data

# Start containers again (will create fresh database and run migrations)
docker compose up -d

# Wait for backend to finish migrations (check logs)
docker compose logs -f backend
# Wait until you see: "All migrations have been successfully applied."
# Then press Ctrl+C to exit logs

# Now run seed (migrations must complete first)
docker compose exec backend npm run prisma:seed
```

### Option 2: Reset and Seed in One Go

```bash
# Stop containers
docker compose down

# Remove database volume
docker volume rm solarcrm_postgres_data

# Start containers
docker compose up -d

# Wait 30 seconds for migrations, then seed
sleep 30
docker compose exec backend npm run prisma:seed
```

### Option 3: Manual Migration Then Seed

```bash
# Make sure containers are running
docker compose up -d

# Wait for postgres to be ready
docker compose exec postgres pg_isready -U solarsync -d solarsync_db

# Run migrations manually
docker compose exec backend npx prisma migrate deploy

# Then run seed
docker compose exec backend npm run prisma:seed
```

## What the Seed File Now Creates

The seed file now **only creates users** with these roles:

1. **Super Admin** - `admin@solarsync.com` / `password123`
2. **Director** - `director@solarsync.com` / `password123`
3. **Sales Person** - `salesman@solarsync.com` / `password123`
4. **Designer** - `designer@solarsync.com` / `password123`
5. **Production Lead** - `production@solarsync.com` / `password123`
6. **Purchase Manager** - `purchase@solarsync.com` / `password123`

**No clients, enquiries, or other data will be created.**

## Verify Seed Worked

```bash
# Check users were created
docker compose exec postgres psql -U solarsync -d solarsync_db -c "SELECT email, role, name FROM \"User\";"
```

## Important Notes

- **All data will be lost** when you reset the database
- The seed file uses `upsert`, so running it multiple times won't create duplicates
- Default password for all users is: `password123`
- **Change passwords after first login in production!**
- **Always wait for migrations to complete before running seed**
