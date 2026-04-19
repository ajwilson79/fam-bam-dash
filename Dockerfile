# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# VITE_ vars are baked into the JS bundle at build time.
# VITE_GOOGLE_CLIENT_ID is required so OAuth works in the browser.
# Everything else can be left blank — the app is fully configurable via the UI.
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_GCAL_CALENDAR_ID
ARG VITE_TIMEZONE

ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_GCAL_CALENDAR_ID=$VITE_GCAL_CALENDAR_ID
ENV VITE_TIMEZONE=$VITE_TIMEZONE

COPY app/package*.json ./
RUN npm ci

COPY app/ ./
RUN npm run build

# Runtime stage — keeps node_modules so `vite preview` can run the API plugins
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/vite.config.ts ./vite.config.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig*.json ./

# Persistent data (todos, settings, uploaded photos)
RUN mkdir -p data public/uploads
VOLUME ["/app/data", "/app/public/uploads"]

EXPOSE 12000

# vite preview serves the built dist/ AND runs the configurePreviewServer plugins
# (todos, settings, gcal proxy, oauth, photos, ical)
CMD ["node_modules/.bin/vite", "preview", "--host", "0.0.0.0", "--port", "12000"]
