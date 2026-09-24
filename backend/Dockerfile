# Build from the repository root: docker build -f backend/Dockerfile -t car-management-backend .

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --ignore-scripts
COPY shared shared
COPY backend backend
# Generating the client needs no database, but the Prisma config requires the variable.
RUN DATABASE_URL=mysql://unused@localhost/unused npm run db:generate -w backend \
  && npm run build -w shared \
  && npm run build -w backend

FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
# Skip install scripts (the backend's would run prisma generate, which the build stage did),
# then run only the one that downloads Prisma's schema engine, needed for migrations.
RUN npm ci --omit=dev -w backend --ignore-scripts \
  && npm rebuild @prisma/engines \
  && npm cache clean --force
COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/backend/dist backend/dist
COPY backend/prisma backend/prisma
COPY backend/prisma.config.ts backend/

WORKDIR /app/backend
USER node
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/index.js"]
