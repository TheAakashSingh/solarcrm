# Backend Start Guide

## ⚠️ Connection Error Fix

If you see `ERR_CONNECTION_REFUSED` errors, it means the backend is not running.

## Quick Start

### 1. Navigate to Backend Directory
```bash
cd backend
```

### 2. Install Dependencies (if not done)
```bash
npm install
```

### 3. Setup Database
```bash
# Generate Prisma Client
npm run prisma:generate

# Run Migrations
npm run prisma:migrate

# Seed Database (optional - creates demo users)
npm run prisma:seed
```

### 4. Create Environment File
Create `backend/.env` file:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/solarsync_crm?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
PORT=5000
FRONTEND_URL="http://localhost:8082"
NODE_ENV=development
```

### 5. Start Backend Server
```bash
npm run dev
```

The backend should now be running on `http://localhost:5000`

## Verify Backend is Running

Open in browser: `http://localhost:5000/api/health` (if health endpoint exists)
Or check terminal for: `Server running on port 5000`

## Frontend Connection

Once backend is running:
1. Refresh your frontend browser
2. The connection errors should disappear
3. You can now login and use the application

## Default Login Credentials

After seeding the database:
- **Superadmin**: `admin@solarsync.com` / `password123`
- **Director**: `director@solarsync.com` / `password123`
- **Salesperson**: `salesman@solarsync.com` / `password123`
- **Designer**: `designer@solarsync.com` / `password123`
- **Production**: `production@solarsync.com` / `password123`
- **Purchase**: `purchase@solarsync.com` / `password123`

## Troubleshooting

### Port 5000 Already in Use
Change `PORT=5000` to another port (e.g., `PORT=5001`) in `backend/.env` and update `VITE_API_BASE_URL` in frontend `.env.development`

### Database Connection Error
- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `backend/.env` is correct
- Verify database exists: `createdb solarsync_crm` (if needed)

### CORS Errors
- Ensure `FRONTEND_URL` in `backend/.env` matches your frontend URL
- Default: `http://localhost:8082` (Vite default port)
