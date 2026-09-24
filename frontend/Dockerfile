# Build from the repository root: docker build -f frontend/Dockerfile -t car-management-frontend .

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci -w frontend --ignore-scripts
COPY shared shared
COPY frontend frontend
RUN npm run build -w frontend

FROM nginx:1.29-alpine
# Where nginx forwards /api requests to.
ENV BACKEND_URL=http://backend:3000
COPY frontend/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/frontend/dist /usr/share/nginx/html
