# 🐳 РАЗВЕРТЫВАНИЕ С DOCKER

## ✅ У вас уже есть:
- ✅ `Dockerfile` - готов к использованию
- ✅ `nginx.conf` - оптимизированная конфигурация
- ✅ `.env` файл с переменными Supabase
- ✅ Docker установлен

## 🚀 БЫСТРОЕ РАЗВЕРТЫВАНИЕ (3 команды):

### Команды для выполнения:
```bash
# 1. Соберите Docker образ
docker build -t exam-management-app .

# 2. Запустите контейнер
docker run -d -p 8080:8080 --name exam-app exam-management-app

# 3. Проверьте статус
docker ps
```

## 🌐 Результат:
После выполнения команд ваше приложение будет доступно по адресу:
**http://localhost:8080**

## 🔧 Дополнительные команды для управления:

### Просмотр логов:
```bash
docker logs exam-app
```

### Остановка приложения:
```bash
docker stop exam-app
```

### Перезапуск:
```bash
docker restart exam-app
```

### Удаление контейнера:
```bash
docker stop exam-app
docker rm exam-app
```

### Пересборка после изменений:
```bash
docker stop exam-app
docker rm exam-app
docker build -t exam-management-app .
docker run -d -p 8080:8080 --name exam-app exam-management-app
```

## 🌍 Доступ из внешней сети:

### Если хотите доступ из интернета:

#### Вариант 1: Через ngrok (быстро для тестирования)
```bash
# Установите ngrok
# Затем:
ngrok http 8080
```
Получите публичный URL вида: `https://abc123.ngrok.io`

#### Вариант 2: На VPS сервере
```bash
# На сервере выполните те же команды
# Приложение будет доступно по IP сервера:
http://ваш-ip-сервера:8080
```

#### Вариант 3: С доменом и SSL
```bash
# Используйте nginx proxy или Traefik
# Для автоматического SSL с Let's Encrypt
```

## 🔒 Настройка безопасности:

### 1. Настройте CORS в Supabase:
1. [Supabase Dashboard](https://supabase.com/dashboard)
2. Settings → API → CORS origins
3. Добавьте:
   - `http://localhost:8080`
   - Ваш публичный URL (если используете ngrok/VPS)

### 2. Включите защиту в Supabase:
1. Authentication → Settings → Security
2. Включите "Leaked Password Protection"
3. Authentication → Settings → Multi-Factor Authentication
4. Включите MFA опции

## 📊 Мониторинг:

### Проверка работы:
```bash
# Проверка статуса контейнера
docker ps

# Проверка логов
docker logs exam-app

# Проверка ресурсов
docker stats exam-app

# Проверка доступности
curl http://localhost:8080
```

## 🎯 Преимущества Docker развертывания:

- ✅ Полный контроль над окружением
- ✅ Изоляция приложения
- ✅ Легкое масштабирование
- ✅ Одинаковое поведение везде
- ✅ Простое обновление

## 🚀 НАЧИНАЙТЕ ПРЯМО СЕЙЧАС!

Выполните первую команду:
```bash
docker build -t exam-management-app .
```

И сообщите результат!