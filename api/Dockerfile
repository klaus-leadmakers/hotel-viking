FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --quiet
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3   CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/main"]
