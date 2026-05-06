# ── Stage 1: генерация Prisma Client ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

# ── Stage 2: production-образ ─────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Только prod-зависимости
COPY package*.json ./
RUN npm ci --omit=dev

# Скопировать сгенерированный Prisma Client из builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Код приложения
COPY . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && node server/index.js"]
