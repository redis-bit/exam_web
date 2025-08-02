# Multi-stage build для оптимизации размера образа
FROM node:18-alpine as build

# Установка рабочей директории
WORKDIR /app

# Копирование файлов зависимостей
COPY package*.json ./

# Установка зависимостей
RUN npm ci --only=production --silent

# Копирование исходного кода
COPY . .

# Сборка приложения
RUN npm run build

# Production stage
FROM nginx:alpine

# Копирование собранного приложения
COPY --from=build /app/build /usr/share/nginx/html

# Копирование конфигурации nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Создание пользователя для nginx
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Установка прав доступа
RUN chown -R nextjs:nodejs /usr/share/nginx/html
RUN chown -R nextjs:nodejs /var/cache/nginx
RUN chown -R nextjs:nodejs /var/log/nginx
RUN chown -R nextjs:nodejs /etc/nginx/conf.d

# Переключение на непривилегированного пользователя
USER nextjs

# Открытие порта
EXPOSE 8080

# Запуск nginx
CMD ["nginx", "-g", "daemon off;"]