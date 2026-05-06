# 🚀 Деплой на VPS — пошаговая инструкция

Это руководство для запуска проекта на Linux VPS через Docker.

---

## Что нужно на сервере

- Linux (Ubuntu 22.04 / Debian 12)
- Docker + Docker Compose
- Nginx (устанавливается отдельно, не входит в контейнер)
- Домен, привязанный к IP сервера

---

## Шаг 1 — Установка Docker (если ещё нет)

```bash
curl -fsSL https://get.docker.com | sh
```

Проверь что установилось:

```bash
docker --version
docker compose version
```

---

## Шаг 2 — Клонировать репозиторий на сервер

```bash
git clone https://github.com/kimnikge/form-byqaz.git /srv/form-byqaz
cd /srv/form-byqaz
```

> Если используешь приватный репо — сначала настрой SSH-ключ или Personal Access Token.

---

## Шаг 3 — Создать файл `.env`

```bash
cp .env.example .env
nano .env
```

Заполни значения:

```env
PORT=3000
ADMIN_USER=admin
ADMIN_PASSWORD=ВАШ_ПАРОЛЬ
DATABASE_URL="file:/app/data/db.sqlite"
```

> ⚠️ `DATABASE_URL` не менять — путь должен быть именно таким для работы внутри контейнера.

---

## Шаг 4 — Собрать и запустить контейнер

```bash
docker compose up -d --build
```

Проверь что запустилось:

```bash
docker compose ps
docker compose logs -f
```

Приложение работает на порту **3000**. Пока без HTTPS — это настраивается через Nginx на следующем шаге.

---

## Шаг 5 — Настроить Nginx как reverse proxy

### Установка Nginx

```bash
apt update
apt install nginx -y
```

### Создать конфиг для сайта

```bash
nano /etc/nginx/sites-available/form-byqaz
```

Вставь:

```nginx
server {
    listen 80;
    server_name ВАШ_ДОМЕН.ru;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }
}
```

Активируй конфиг:

```bash
ln -s /etc/nginx/sites-available/form-byqaz /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## Шаг 6 — Получить SSL-сертификат (HTTPS)

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d ВАШ_ДОМЕН.ru
```

Certbot сам обновит конфиг Nginx и добавит HTTPS. Готово!

---

## Полезные команды

| Действие | Команда |
|---|---|
| Перезапустить контейнер | `docker compose restart` |
| Остановить | `docker compose down` |
| Пересобрать после изменений | `docker compose up -d --build` |
| Посмотреть логи | `docker compose logs -f` |
| Войти внутрь контейнера | `docker compose exec app sh` |

---

## Структура проекта

```
form-byqaz/
├── public/          # Фронтенд (заглушка + форма)
├── views/           # Админ-панель
├── server/          # Node.js бэкенд (Express)
│   ├── routes/      # API маршруты
│   └── middleware/  # Basic Auth
├── prisma/          # Схема и миграции SQLite
├── Dockerfile       # Сборка контейнера
├── docker-compose.yml
└── .env.example     # Шаблон переменных окружения
```
