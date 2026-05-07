# 🔧 Подробное руководство по настройке Nginx для Docker

Этот файл содержит пошаговые инструкции для корректной настройки Nginx в качестве reverse proxy для Node.js приложения в Docker.

---

## 📋 Содержание

1. [Предварительные требования](#предварительные-требования)
2. [Установка Nginx](#установка-nginx)
3. [Основные концепции](#основные-концепции)
4. [Создание конфига для сайта](#создание-конфига-для-сайта)
5. [Полный конфиг с комментариями](#полный-конфиг-с-комментариями)
6. [Активация конфига](#активация-конфига)
7. [Проверка и перезагрузка](#проверка-и-перезагрузка)
8. [Добавление SSL/HTTPS](#добавление-sslhttps)
9. [Отладка и логи](#отладка-и-логи)
10. [Типичные проблемы](#типичные-проблемы)

---

## 📌 Предварительные требования

Перед тем как начать, убедись что:

- ✅ Docker и Docker Compose установлены
- ✅ Контейнер приложения запущен и работает на порту **3000**
- ✅ У тебя есть доступ к серверу по SSH
- ✅ Установлен Nginx на хост-машине (не внутри контейнера)
- ✅ Домен указывает на IP твоего сервера

Проверь что Docker работает:

```bash
docker compose ps
docker compose logs app | grep "running on"
```

Должно быть что-то вроде:
```
byQAZ server running on http://localhost:3000
```

---

## 🚀 Установка Nginx

### Шаг 1.1: Обновить список пакетов

```bash
sudo apt update
```

### Шаг 1.2: Установить Nginx

```bash
sudo apt install nginx -y
```

### Шаг 1.3: Проверить установку

```bash
nginx -v
```

Вывод должен быть примерно:
```
nginx version: nginx/1.24.0 (Ubuntu)
```

### Шаг 1.4: Запустить Nginx

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

Проверить статус:

```bash
sudo systemctl status nginx
```

Статус должен быть **active (running)**.

---

## 📚 Основные концепции

### Что такое Reverse Proxy?

Nginx работает как **intermediary** между пользователем и Node.js приложением:

```
Пользователь (browser)
       ↓
   Nginx (порт 80/443)
       ↓
 Node.js приложение (порт 3000 в Docker)
```

### Почему это нужно?

1. **HTTPS/SSL** — Nginx обрабатывает SSL, защищая соединение
2. **Кеширование** — Nginx может кешировать статические файлы
3. **Balancing** — Можно распределять нагрузку между несколькими контейнерами
4. **Безопасность** — Скрывает внутренние порты приложения
5. **Производительность** — Nginx быстрее обрабатывает статику

---

## 🔨 Создание конфига для сайта

### Шаг 2.1: Структура конфигов Nginx

Конфиги Nginx хранятся в папке `/etc/nginx/`:

```
/etc/nginx/
├── nginx.conf                 # Главный конфиг (не трогай)
├── sites-available/           # Доступные конфиги (здесь создаём)
│   ├── default
│   └── form-byqaz             # ← Наш конфиг
├── sites-enabled/             # Активные конфиги (ссылки)
│   ├── default
│   └── form-byqaz             # ← Символическая ссылка
└── conf.d/                    # Дополнительные конфиги
```

**Логика**: 
- Создаём конфиг в `sites-available`
- Активируем через **символическую ссылку** в `sites-enabled`
- Nginx загружает конфиги из `sites-enabled`

---

## 🎯 Полный конфиг с комментариями

### Шаг 3.1: Открыть редактор

```bash
sudo nano /etc/nginx/sites-available/form-byqaz
```

### Шаг 3.2: Вставить конфиг ниже

```nginx
# ============================================================================
# Nginx конфиг для form-byqaz
# Перенаправляет HTTP на HTTPS и проксирует запросы к Docker контейнеру
# ============================================================================

# 1️⃣ БЛОК ДЛЯ HTTP (порт 80) — только для редиректа на HTTPS
server {
    # Слушаем на порту 80 (HTTP)
    listen 80;
    listen [::]:80;
    
    # Домены, на которые реагирует этот конфиг
    server_name ВАШ_ДОМЕН.ru www.ВАШ_ДОМЕН.ru;
    
    # Логирование
    access_log /var/log/nginx/form-byqaz_access.log;
    error_log /var/log/nginx/form-byqaz_error.log;
    
    # ❌ ВСЕ HTTP запросы → HTTPS редирект
    location / {
        return 301 https://$server_name$request_uri;
    }
    
    # 🔐 Certbot нужна эта папка для проверки SSL
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
}

# 2️⃣ БЛОК ДЛЯ HTTPS (порт 443) — основной блок
server {
    # Слушаем на порту 443 (HTTPS)
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    
    # Домены
    server_name ВАШ_ДОМЕН.ru www.ВАШ_ДОМЕН.ru;
    
    # 🔑 Пути к SSL сертификатам (Certbot создаст автоматически)
    ssl_certificate /etc/letsencrypt/live/ВАШ_ДОМЕН.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ВАШ_ДОМЕН.ru/privkey.pem;
    
    # 🛡️ Параметры SSL (безопасность и производительность)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Логирование
    access_log /var/log/nginx/form-byqaz_access.log;
    error_log /var/log/nginx/form-byqaz_error.log;
    
    # 📝 Ограничение размера тела запроса (для загрузки файлов)
    client_max_body_size 100M;
    
    # 🔹 ОСНОВНОЙ ПРОКСИРОВАНИЕ НА DOCKER
    location / {
        # 1. Адрес Docker контейнера
        # localhost:3000 — контейнер запущен локально на порту 3000
        proxy_pass http://localhost:3000;
        
        # 2. Версия HTTP для связи с бэкендом
        proxy_http_version 1.1;
        
        # 3. Передаём заголовки оригинального запроса
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 4. WebSocket поддержка (если нужна)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # 5. Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # 6. Буферизация ответов
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }
    
    # 🖼️ Статические файлы (кеширование)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        
        # Кешируем на 1 год
        expires 365d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
}

# ============================================================================
# ⚙️ ПОЯСНЕНИЯ К КЛЮЧЕВЫМ ПАРАМЕТРАМ
# ============================================================================
#
# server_name       — Домены, на которые реагирует этот блок
# listen            — Порт и тип (ssl для HTTPS)
# proxy_pass        — Адрес, куда проксировать запросы
# ssl_certificate   — Путь к публичному ключу (предоставляется Certbot)
# ssl_certificate_key — Путь к приватному ключу (ТАЙНА! Защищай)
# client_max_body_size — Максимальный размер загружаемого файла
# proxy_set_header  — Передача информации оригинального запроса
# expires           — Кеш-контроль для статических файлов
#
```

---

## ⚙️ Активация конфига

### Шаг 4.1: Сохранить файл в nano

Нажми:
1. `Ctrl + X`
2. `Y` (yes)
3. `Enter` (подтверди имя файла)

### Шаг 4.2: Создать символическую ссылку

```bash
sudo ln -s /etc/nginx/sites-available/form-byqaz /etc/nginx/sites-enabled/form-byqaz
```

### Шаг 4.3: Отключить конфиг по умолчанию (опционально)

```bash
sudo unlink /etc/nginx/sites-enabled/default
```

---

## ✅ Проверка и перезагрузка

### Шаг 5.1: Проверить синтаксис конфига

**ОБЯЗАТЕЛЬНО** перед перезагрузкой!

```bash
sudo nginx -t
```

Должно быть:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration will be successful
```

⚠️ Если есть ошибки — **НЕ** перезагружай! Исправь ошибки в конфиге.

### Шаг 5.2: Перезагрузить Nginx

```bash
sudo systemctl reload nginx
```

Если первый раз включаешь:

```bash
sudo systemctl restart nginx
```

### Шаг 5.3: Проверить статус

```bash
sudo systemctl status nginx
```

Должно быть **active (running)**.

---

## 🔐 Добавление SSL/HTTPS

### Шаг 6.1: Установить Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Шаг 6.2: Получить сертификат

```bash
sudo certbot --nginx -d ВАШ_ДОМЕН.ru -d www.ВАШ_ДОМЕН.ru
```

Ответить на вопросы:
- **Email** — твой email для восстановления
- **Terms of Service** — введи `Y`
- **Sharing email** — введи `Y` (рекомендация)
- **Redirect HTTP to HTTPS** — введи `2` (это сделает наш конфиг)

### Шаг 6.3: Проверить сертификат

```bash
sudo certbot certificates
```

Вывод покажет статус и дату истечения сертификата.

### Шаг 6.4: Автоматическое обновление

Certbot автоматически обновляет сертификаты за 30 дней до истечения:

```bash
sudo systemctl enable certbot.timer
```

Проверить:

```bash
sudo systemctl status certbot.timer
```

---

## 🔍 Отладка и логи

### Просмотр логов Nginx

```bash
# Все логи в реальном времени
sudo tail -f /var/log/nginx/form-byqaz_access.log

# Последние 50 строк
sudo tail -50 /var/log/nginx/form-byqaz_access.log

# Ошибки
sudo tail -f /var/log/nginx/form-byqaz_error.log
```

### Проверить что слушает Nginx

```bash
sudo netstat -tlnp | grep nginx
```

Должны быть порты **80** и **443**.

### Проверить конфиги

```bash
# Прочитать активный конфиг
sudo nginx -T

# Посмотреть только наш конфиг
sudo cat /etc/nginx/sites-enabled/form-byqaz
```

### Посмотреть логи контейнера

```bash
docker compose logs -f app
```

---

## ⚠️ Типичные проблемы и решения

### ❌ Проблема: "502 Bad Gateway"

**Причины:**
1. Docker контейнер не запущен
2. Неправильный адрес proxy_pass

**Решение:**

```bash
# Проверить контейнер
docker compose ps
docker compose logs app

# Проверить что приложение слушает на порту 3000
docker compose exec app netstat -tlnp | grep 3000

# Проверить коннект с Nginx хоста
telnet localhost 3000
```

### ❌ Проблема: "Connection refused"

**Причина:** Nginx не может подключиться к localhost:3000

**Решение:**

Если используешь Docker Compose, адрес может быть `app:3000` вместо `localhost:3000`:

```bash
# Проверить имя сервиса в docker-compose.yml
cat docker-compose.yml

# Если сервис называется "app", то используй:
proxy_pass http://app:3000;
```

⚠️ **ТОЛЬКО если Nginx запущен в отдельном контейнере!**
Если Nginx на хосте — используй `localhost:3000`.

### ❌ Проблема: "Cannot GET /"

**Причина:** Docker контейнер запущен, но Express не отвечает

**Решение:**

```bash
# Посмотри логи приложения
docker compose logs app

# Проверь что PORT=3000 установлен
docker compose exec app echo $PORT

# Перезапусти контейнер
docker compose restart app
```

### ❌ Проблема: SSL сертификат не работает

**Причина:** Certbot не может подтвердить домен

**Решение:**

```bash
# Проверь что .well-known доступен
curl http://ВАШ_ДОМЕН.ru/.well-known/

# Проверь права доступа
sudo ls -la /var/www/certbot

# Пересоздай сертификат
sudo certbot renew --force-renewal
```

### ❌ Проблема: "Too many redirects"

**Причина:** Бесконечный редирект между HTTP и HTTPS

**Решение:**

Проверь что в Docker контейнере НЕ установлен редирект на HTTPS.
В Express приложении не должно быть:

```javascript
// ❌ НЕПРАВИЛЬНО — убери это!
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

Пусть Nginx обрабатывает редирект!

---

## ✨ Полная последовательность команд (для спешки)

```bash
# 1. Установить Nginx
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx -y

# 2. Создать конфиг (скопируй из раздела выше полный конфиг)
sudo nano /etc/nginx/sites-available/form-byqaz

# 3. Активировать
sudo ln -s /etc/nginx/sites-available/form-byqaz /etc/nginx/sites-enabled/form-byqaz
sudo unlink /etc/nginx/sites-enabled/default

# 4. Проверить синтаксис
sudo nginx -t

# 5. Перезагрузить
sudo systemctl reload nginx

# 6. Получить SSL сертификат
sudo certbot --nginx -d ВАШ_ДОМЕН.ru -d www.ВАШ_ДОМЕН.ru

# 7. Проверить что работает
curl https://ВАШ_ДОМЕН.ru
```

---

## 📞 Итоговая схема

После всех настроек запросы пойдут так:

```
1. Пользователь заходит https://ВАШ_ДОМЕН.ru
                ↓
2. DNS → IP сервера
                ↓
3. Nginx слушает порт 443 (HTTPS)
                ↓
4. Nginx проверяет SSL сертификат ✅
                ↓
5. proxy_pass → http://localhost:3000
                ↓
6. Docker контейнер обрабатывает запрос
                ↓
7. Ответ отправляется обратно через Nginx
                ↓
8. Пользователь получает ответ 🎉
```

---

## 🎓 Полезные ресурсы

- [Nginx Docs](https://nginx.org/en/docs/)
- [Certbot Docs](https://certbot.eff.org/docs/)
- [SSL Labs Test](https://www.ssllabs.com/ssltest/) — проверь качество SSL

---

**Если что-то не работает — посмотри раздел "Типичные проблемы и решения" ☝️**
