FROM node:20-alpine

WORKDIR /app

# Ставим зависимости
COPY package*.json ./
RUN npm ci --omit=dev

# Копируем весь проект
COPY . .

# Генерируем Prisma client
RUN npx prisma generate

EXPOSE 3000

# При старте: накатываем миграции и запускаем сервер
CMD ["sh", "-c", "npx prisma migrate deploy && node server/index.js"]
