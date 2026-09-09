FROM node:20-alpine AS builder

WORKDIR /app

# Install root deps
COPY package*.json ./
RUN npm ci

# Install client deps & build
COPY client/package*.json ./client/
RUN cd client && npm ci

COPY . .
RUN cd client && npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=10000

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/server ./server
COPY --from=builder /app/bin ./bin
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 10000

CMD ["node", "server/index.js"]
