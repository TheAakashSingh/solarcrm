# Reset Database and Re-seed with User Roles Only

## Steps to Clear Database and Re-seed

### Option 1: Reset Database (Docker) - Recommended

This will completely reset your database and re-run migrations and seed:

```bash
# Stop containers
docker compose down

# Remove the database volume (WARNING: This deletes ALL data)
docker volume rm solarcrm_postgres_data

# Start containers again (will create fresh database, run migrations, and seed)
docker compose up -d

# Run seed manually (migrations run automatically on startup)
docker compose exec backend npm run prisma:seed
```

### Option 2: Reset Database Using Prisma (Manual)

If you want to keep the database structure but clear all data:

```bash
# Connect to backend container
docker compose exec backend sh

# Reset database (drops all data and re-runs migrations)
npx prisma migrate reset

# Or if you just want to seed without reset
npm run prisma:seed
```

### Option 3: Reset Database Using SQL (Direct)

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U solarsync -d solarsync_db

# Drop all tables (be careful!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

# Exit psql
\q

# Run migrations again
docker compose exec backend npx prisma migrate deploy

# Run seed
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
docker compose exec backend npx prisma studio
# Or using SQL:
docker compose exec postgres psql -U solarsync -d solarsync_db -c "SELECT email, role, name FROM \"User\";"
```

## Important Notes

- **All data will be lost** when you reset the database
- The seed file uses `upsert`, so running it multiple times won't create duplicates
- Default password for all users is: `password123`
- **Change passwords after first login in production!**

