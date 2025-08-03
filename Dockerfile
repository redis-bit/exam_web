# Этап 1 — билдим React-приложение
FROM node:20-alpine as build
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

# Этап 2 — деплоим через стабильный nginx
FROM nginx:1.25-alpine
COPY --from=build /app/build /usr/share/nginx/html

# Открываем порт
EXPOSE 80

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]
