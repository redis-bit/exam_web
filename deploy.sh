#!/bin/bash

# Скрипт для развертывания приложения
# Использование: ./deploy.sh [vercel|netlify|docker]

set -e

echo "🚀 Начинаем развертывание приложения..."

# Проверка наличия .env файла
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден!"
    echo "📝 Создайте .env файл на основе .env.example"
    exit 1
fi

# Проверка переменных окружения
source .env
if [ -z "$REACT_APP_SUPABASE_URL" ] || [ -z "$REACT_APP_SUPABASE_ANON_KEY" ]; then
    echo "❌ Не заданы обязательные переменные окружения!"
    echo "📝 Проверьте REACT_APP_SUPABASE_URL и REACT_APP_SUPABASE_ANON_KEY в .env"
    exit 1
fi

# Установка зависимостей
echo "📦 Установка зависимостей..."
npm ci

# Проверка TypeScript
echo "🔍 Проверка TypeScript..."
npx tsc --noEmit

# Сборка приложения
echo "🔨 Сборка приложения..."
npm run build

# Проверка успешности сборки
if [ ! -d "build" ]; then
    echo "❌ Ошибка сборки приложения!"
    exit 1
fi

echo "✅ Приложение успешно собрано!"

# Выбор платформы развертывания
PLATFORM=${1:-"help"}

case $PLATFORM in
    "vercel")
        echo "🌟 Развертывание на Vercel..."
        if ! command -v vercel &> /dev/null; then
            echo "📦 Установка Vercel CLI..."
            npm install -g vercel
        fi
        
        echo "🔑 Войдите в аккаунт Vercel (если еще не вошли)"
        vercel login
        
        echo "🚀 Развертывание..."
        vercel --prod
        
        echo "✅ Приложение развернуто на Vercel!"
        ;;
        
    "netlify")
        echo "🔥 Развертывание на Netlify..."
        if ! command -v netlify &> /dev/null; then
            echo "📦 Установка Netlify CLI..."
            npm install -g netlify-cli
        fi
        
        echo "🔑 Войдите в аккаунт Netlify (если еще не вошли)"
        netlify login
        
        echo "🚀 Развертывание..."
        netlify deploy --prod --dir=build
        
        echo "✅ Приложение развернуто на Netlify!"
        ;;
        
    "docker")
        echo "🐳 Сборка Docker образа..."
        
        # Проверка наличия Docker
        if ! command -v docker &> /dev/null; then
            echo "❌ Docker не установлен!"
            echo "📝 Установите Docker: https://docs.docker.com/get-docker/"
            exit 1
        fi
        
        # Сборка образа
        docker build -t exam-management-app .
        
        echo "🚀 Запуск контейнера..."
        docker run -d -p 8080:8080 --name exam-app exam-management-app
        
        echo "✅ Приложение запущено в Docker контейнере!"
        echo "🌐 Доступно по адресу: http://localhost:8080"
        ;;
        
    "help"|*)
        echo "📖 Использование: ./deploy.sh [платформа]"
        echo ""
        echo "Доступные платформы:"
        echo "  vercel   - Развертывание на Vercel (рекомендуется)"
        echo "  netlify  - Развертывание на Netlify"
        echo "  docker   - Запуск в Docker контейнере"
        echo ""
        echo "Примеры:"
        echo "  ./deploy.sh vercel"
        echo "  ./deploy.sh netlify"
        echo "  ./deploy.sh docker"
        ;;
esac