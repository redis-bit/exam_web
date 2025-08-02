# 🚀 Руководство по развертыванию приложения

## Варианты развертывания

### 1. 🌟 Vercel (Рекомендуется для React)
**Преимущества:** Бесплатно, автоматические деплои, CDN, HTTPS
**Подходит для:** Production-ready приложений

### 2. 🔥 Netlify  
**Преимущества:** Бесплатно, простая настройка, формы, функции
**Подходит для:** Статических сайтов и SPA

### 3. ☁️ Supabase Hosting
**Преимущества:** Интеграция с базой данных, один провайдер
**Подходит для:** Полная интеграция с Supabase

### 4. 🐳 Docker + VPS
**Преимущества:** Полный контроль, собственный сервер
**Подходит для:** Корпоративного использования

### 5. 📦 GitHub Pages
**Преимущества:** Бесплатно для публичных репозиториев
**Подходит для:** Демо и тестирования

## Пошаговые инструкции

### Вариант 1: Vercel (Рекомендуется)

#### Шаг 1: Подготовка проекта
```bash
# Убедитесь, что проект собирается локально
npm run build

# Создайте файл vercel.json (если нужен)
```

#### Шаг 2: Развертывание через CLI
```bash
# Установите Vercel CLI
npm i -g vercel

# Войдите в аккаунт
vercel login

# Разверните проект
vercel

# Для production
vercel --prod
```

#### Шаг 3: Настройка переменных окружения
В Vercel Dashboard:
1. Перейдите в Settings → Environment Variables
2. Добавьте все переменные из .env файла

### Вариант 2: Netlify

#### Шаг 1: Через Git
1. Зайдите на netlify.com
2. "New site from Git"
3. Выберите ваш репозиторий
4. Build command: `npm run build`
5. Publish directory: `build`

#### Шаг 2: Переменные окружения
1. Site settings → Environment variables
2. Добавьте все REACT_APP_ переменные

### Вариант 3: Docker развертывание

#### Создайте Dockerfile:
```dockerfile
# Используйте официальный Node.js образ
FROM node:18-alpine as build

# Установите рабочую директорию
WORKDIR /app

# Скопируйте package.json и package-lock.json
COPY package*.json ./

# Установите зависимости
RUN npm ci --only=production

# Скопируйте исходный код
COPY . .

# Соберите приложение
RUN npm run build

# Используйте nginx для раздачи статических файлов
FROM nginx:alpine

# Скопируйте собранное приложение
COPY --from=build /app/build /usr/share/nginx/html

# Скопируйте конфигурацию nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Откройте порт 80
EXPOSE 80

# Запустите nginx
CMD ["nginx", "-g", "daemon off;"]
```

#### Создайте nginx.conf:
```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Обработка SPA маршрутов
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Кэширование статических ресурсов
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

#### Команды для Docker:
```bash
# Соберите образ
docker build -t exam-management-app .

# Запустите контейнер
docker run -p 80:80 exam-management-app
```

## Настройка переменных окружения

### Обязательные переменные:
```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Дополнительные переменные:
```env
REACT_APP_ENVIRONMENT=production
REACT_APP_API_URL=your_api_url
```

## Настройка домена и HTTPS

### Для Vercel:
1. Domains → Add domain
2. Настройте DNS записи
3. HTTPS настраивается автоматически

### Для Netlify:
1. Domain settings → Add custom domain
2. Настройте DNS
3. SSL сертификат выдается автоматически

### Для собственного сервера:
```bash
# Установите Certbot для Let's Encrypt
sudo apt install certbot python3-certbot-nginx

# Получите SSL сертификат
sudo certbot --nginx -d yourdomain.com
```

## Оптимизация для production

### 1. Минификация и сжатие
```json
// package.json
{
  "scripts": {
    "build": "react-scripts build && npm run compress",
    "compress": "gzip -k build/static/js/*.js && gzip -k build/static/css/*.css"
  }
}
```

### 2. Настройка кэширования
```javascript
// В public/index.html добавьте meta теги
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
```

### 3. Мониторинг и аналитика
```javascript
// Добавьте в src/index.tsx
if (process.env.NODE_ENV === 'production') {
  // Google Analytics или другая аналитика
}
```

## Безопасность

### 1. Настройка CORS в Supabase
1. Supabase Dashboard → Settings → API
2. Добавьте ваш домен в CORS origins

### 2. Настройка CSP заголовков
```nginx
# В nginx.conf
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';";
```

### 3. Скрытие исходного кода
```json
// package.json
{
  "scripts": {
    "build": "GENERATE_SOURCEMAP=false react-scripts build"
  }
}
```

## Мониторинг и логирование

### Настройка мониторинга:
```javascript
// src/utils/monitoring.ts
export const logError = (error: Error, context: string) => {
  if (process.env.NODE_ENV === 'production') {
    // Отправка в сервис мониторинга
    console.error(`[${context}]`, error);
  }
};
```

## Автоматическое развертывание

### GitHub Actions для Vercel:
```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## Проверка развертывания

### Чек-лист после развертывания:
- [ ] Приложение загружается без ошибок
- [ ] Аутентификация работает
- [ ] База данных подключена
- [ ] Все функции работают корректно
- [ ] HTTPS настроен
- [ ] Мобильная версия работает
- [ ] Производительность приемлемая

### Команды для проверки:
```bash
# Проверка доступности
curl -I https://yourdomain.com

# Проверка производительности
lighthouse https://yourdomain.com

# Проверка безопасности
nmap -sS yourdomain.com
```