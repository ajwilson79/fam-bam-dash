# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for environment variables
ARG VITE_LAT
ARG VITE_LON
ARG VITE_GCAL_API_KEY
ARG VITE_GCAL_CALENDAR_ID
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_GOOGLE_PHOTOS_ALBUM_ID

# Set as environment variables for the build
ENV VITE_LAT=$VITE_LAT
ENV VITE_LON=$VITE_LON
ENV VITE_GCAL_API_KEY=$VITE_GCAL_API_KEY
ENV VITE_GCAL_CALENDAR_ID=$VITE_GCAL_CALENDAR_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_PHOTOS_ALBUM_ID=$VITE_GOOGLE_PHOTOS_ALBUM_ID

# Copy package files
COPY app/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY app/ ./

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
