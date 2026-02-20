ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:latest
# Multi-stage build for frontend
FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Force cache invalidation for source code
ARG CACHEBUST=202602202600
RUN echo "Cache bust: $CACHEBUST"

COPY frontend/ ./
# Verify that source code is updated (fail if api/units/ is found)
RUN ! grep "api/units/" src/views/home-view.js || (echo "ERROR: Stale source code detected! Trailing slash found." && exit 1)
RUN npm run build

# Final image
FROM $BUILD_FROM

# Install dependencies
RUN apk add --no-cache \
    nginx \
    sqlite

# Python dependencies
COPY requirements.txt /tmp/
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Copy backend
WORKDIR /app
COPY app /app/app

# Copy built frontend
COPY --from=frontend-build /frontend/dist /app/frontend/dist

# Copy nginx config
COPY rootfs /

# Permissions
RUN chmod a+x /etc/services.d/whereisit/run
