# Backend Dockerfile
FROM node:20-alpine AS base

# Install OpenSSL for Prisma (required for Prisma to work properly on Alpine)
RUN apk add --no-cache openssl

# Build stage - generate Prisma client
FROM base AS builder
WORKDIR /app

# Copy package files
COPY backend/package*.json ./
COPY backend/prisma ./prisma

# Install all dependencies (including dev dependencies for Prisma)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install production dependencies + Prisma CLI for migrations
RUN npm ci --only=production && \
    npm install prisma --save-dev && \
    npm cache clean --force

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy dependencies from deps stage (includes production deps)
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy Prisma CLI and generated client from builder (needed for migrations)
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/prisma ./node_modules/prisma

# Copy application code (includes prisma directory)
COPY --chown=nodejs:nodejs backend/ ./

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["node", "server.js"]

