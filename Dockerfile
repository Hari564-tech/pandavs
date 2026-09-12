# Multi-stage Dockerfile for RVIT TeamHub deployment on Render / Cloud
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy full application source
COPY . .

# Set environment and build for standalone node-server
ENV NITRO_PRESET=node-server
ENV NODE_ENV=production
RUN npm run build:render

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# Copy output bundle
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package*.json ./

EXPOSE 8080

CMD ["node", ".output/server/index.mjs"]
