# Техническое задание (ТЗ)
## Проект: Форма предварительной регистрации byQAZ.kz

---

## 1. Цель проекта

Разработать лёгкое веб-приложение для сбора заявок пользователей с последующим просмотром через встроенную админ-панель.

Основные требования:
- Быстрый запуск
- Минимальная архитектурная сложность
- Полный контроль над данными
- Развёртывание в Docker на VPS

---

## 2. Стек технологий

### Backend
- Node.js
- Express
- express-rate-limit (защита от спама)

### Frontend
- HTML + Vanilla JavaScript (без фреймворков)
- i18n через JSON-файлы переводов (RU / KZ)

### База данных
- SQLite (файл `db.sqlite`)

### ORM
- Prisma

### Контейнеризация
- Docker
- docker-compose
- nginx (reverse proxy + HTTPS)

### Зависимости экспорта
- exceljs (выгрузка в Excel/CSV)

---

## 3. Архитектура

```
Клиент (HTML/JS)
      ↓
nginx (80/443)
      ↓
Express API (/api/*)
      ↓
SQLite (через Prisma)
```

Приложение разворачивается как монолит через docker-compose с двумя сервисами: `app` и `nginx`.

---

## 4. Функциональные требования

### 4.1 Форма заявки

Поля:

1. Роль пользователя:
   - Производитель
   - Поставщик
   - Закупщик

2. Условные поля:
   - Производитель → выбор **одной** отрасли
   - Поставщик → **множественный** выбор отраслей
   - Закупщик → тип (тендерщик, оптовик, дистрибьютор, физ. лицо)

   Отрасли (для Производителя и Поставщика):
   - пищевая
   - лёгкая
   - химическая
   - строительная (стройматериалы)
   - сельскохозяйственная
   - машиностроение и оборудование
   - металлургия и металлообработка

3. Контактные данные:
   - Регион (текстовое поле)
   - Имя
   - Телефон (обязательное, формат: `+7XXXXXXXXXX`)

4. Финальный экран после отправки:
   - Текст подтверждения
   - Горячая линия WhatsApp: +77079689998
   - Статичный Kaspi QR (`public/kaspi-qr.png`) для поддержки проекта

5. Отправка формы:
   - `POST /api/lead`
   - Валидация обязательных полей: `role`, `phone`
   - Валидация формата телефона: регулярное выражение `^\+7\d{10}$`
   - Honeypot-поле (скрытое, если заполнено — заявка отклоняется)

6. Двуязычность:
   - Переключатель язык RU / KZ в шапке формы
   - Тексты подгружаются из `public/i18n/ru.json` и `public/i18n/kz.json`
   - Выбор языка сохраняется в `localStorage`

---

### 4.2 Админ-панель

Доступ:
- URL: `/admin`
- Защита через HTTP Basic Auth
- Логин и пароль берутся из переменных окружения: `ADMIN_USER`, `ADMIN_PASSWORD`
- **Пароль не хранится в коде**

Функции:
- Просмотр списка заявок (таблица)
- Отображаемые поля:
  - ID
  - Дата
  - Роль
  - Имя
  - Телефон
  - Регион
  - Отрасль / тип
  - Статус
- Обновление статуса: `new` / `contacted` / `closed`
- Фильтрация на клиенте (по роли, статусу)
- Поиск по имени и телефону
- Кнопка **«Экспорт в Excel»** → `GET /api/leads/export`

---

### 4.3 API

#### `POST /api/lead`
Создание заявки.
- Rate limit: 5 запросов в 10 минут с одного IP
- Валидация: `role`, `phone` обязательны; phone — формат `+7XXXXXXXXXX`
- Проверка honeypot-поля

#### `GET /api/leads`
Получение списка заявок (только из-под Basic Auth middleware).
- Сортировка по `createdAt DESC`

#### `PATCH /api/lead/:id`
Обновление статуса заявки.
- Допустимые значения: `new`, `contacted`, `closed`

#### `GET /api/leads/export`
Выгрузка всех заявок в `.xlsx`.
- Защищён Basic Auth
- Заголовок ответа: `Content-Disposition: attachment; filename=leads.xlsx`

#### `GET /health`
Healthcheck-эндпоинт для Docker.
- Возвращает `200 OK`

---

## 5. Структура базы данных

Таблица: `Lead`

| Поле | Тип | Описание |
|---|---|---|
| id | Int, PK, autoincrement | |
| role | String | `manufacturer` / `supplier` / `buyer` |
| industry | String? | Одна отрасль (только для Производителя) |
| industries | String? | JSON-строка массива отраслей (только для Поставщика), пример: `["пищевая","лёгкая"]` |
| buyerType | String? | Тип закупщика (только для Закупщика) |
| name | String | |
| phone | String | Обязательное, формат `+7XXXXXXXXXX` |
| region | String | |
| status | String | default: `"new"` |
| createdAt | DateTime | default: `now()` |

> **Важно:** поле `industries` хранится как JSON-строка (`JSON.stringify(array)` при записи, `JSON.parse` при чтении).

---

## 6. Безопасность

- Пароль администратора — только через `ENV` (`ADMIN_PASSWORD`), не в коде
- HTTP Basic Auth реализован в отдельном middleware `server/middleware/auth.js`
- Rate limiting на `POST /api/lead`: `express-rate-limit`, 5 req / 10 min / IP
- Honeypot-поле в форме (скрытый input, бот заполняет — сервер отклоняет)
- Валидация всех входящих данных перед записью в БД
- nginx скрывает прямой доступ к порту Node.js

---

## 7. Двуязычность (i18n)

- Файлы переводов: `public/i18n/ru.json`, `public/i18n/kz.json`
- Структура файла: плоский объект `{ "key": "Текст" }`
- JS-функция `t(key)` возвращает строку на активном языке
- Переключатель в шапке (`RU | KZ`), выбор сохраняется в `localStorage`
- Все тексты формы, финального экрана и ошибок валидации — через `t(key)`

---

## 8. Структура проекта

```
project/
├── server/
│   ├── index.js
│   ├── routes/
│   │   ├── leads.js          — POST /api/lead, GET /api/leads, PATCH /api/lead/:id
│   │   └── export.js         — GET /api/leads/export
│   ├── middleware/
│   │   └── auth.js           — HTTP Basic Auth из ENV
│   ├── prisma/
│   │   └── schema.prisma
│   └── db.sqlite
│
├── public/
│   ├── index.html
│   ├── script.js
│   ├── admin.html
│   ├── kaspi-qr.png          — статичный QR Kaspi
│   └── i18n/
│       ├── ru.json
│       └── kz.json
│
├── nginx/
│   └── nginx.conf
│
├── .env.example
├── .env                      — не коммитится в git
├── docker-compose.yml
├── Dockerfile
├── .dockerignore
└── package.json
```

---

## 9. Переменные окружения

Файл `.env.example`:

```
PORT=3000
ADMIN_USER=admin
ADMIN_PASSWORD=changeme
```

---

## 10. Нефункциональные требования

- Поддержка до 1000+ записей без деградации
- Время отклика API < 300 мс
- Docker `HEALTHCHECK` на эндпоинт `GET /health`
- `.env` исключён из `.gitignore` и `.dockerignore`

---

## 11. Деплой

Через `docker-compose`:

```yaml
version: "3.8"
services:
  app:
    build: .
    env_file: .env
    volumes:
      - ./server/db.sqlite:/app/server/db.sqlite
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - app
```

---

## 12. Пошаговый план реализации

### 12.1 Инициализация проекта
1. `npm init -y`
2. Установить зависимости: `express`, `prisma`, `@prisma/client`, `express-rate-limit`, `exceljs`
3. `npx prisma init`

### 12.2 База данных
1. `schema.prisma`: provider = `sqlite`, описать модель `Lead`
2. `npx prisma migrate dev --name init`
3. `npx prisma generate`

### 12.3 Backend
1. `server/middleware/auth.js` — Basic Auth из `process.env`
2. `server/routes/leads.js` — все CRUD-эндпоинты с rate limit и валидацией
3. `server/routes/export.js` — выгрузка xlsx через exceljs
4. `server/index.js` — сборка приложения, подключение роутов, эндпоинт `/health`

### 12.4 Frontend
1. `public/i18n/ru.json`, `kz.json` — все строки интерфейса
2. `public/index.html` + `script.js` — многошаговая форма с условными блоками, i18n, honeypot
3. Финальный экран: подтверждение + QR

### 12.5 Админка
1. `public/admin.html` — таблица заявок, фильтры, поиск, смена статусов, кнопка экспорта
2. Basic Auth обрабатывается на стороне Express (браузер показывает стандартный диалог)

### 12.6 Docker
1. `Dockerfile` (node:alpine)
2. `docker-compose.yml` (app + nginx)
3. `nginx/nginx.conf` — проксирование на `app:3000`
4. `.dockerignore`, `.env.example`

### 12.7 Тестирование
- Отправка формы (все роли, все ветки)
- Валидация телефона и обязательных полей
- Rate limiting (> 5 запросов подряд)
- Honeypot
- Авторизация в админке
- Экспорт Excel
- Переключение языка RU / KZ

### 12.8 Деплой на VPS
1. Скопировать проект на сервер
2. Создать `.env` из `.env.example`
3. `docker-compose up -d --build`
4. Проверить доступ по домену/IP

---

## 13. Вне скоупа (MVP)

- Telegram-уведомления
- Сложная авторизация с ролями
- Пагинация (при < 1000 записей не критично)
- Миграция на PostgreSQL (актуально при росте нагрузки)