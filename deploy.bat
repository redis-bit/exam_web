@echo off
setlocal enabledelayedexpansion

REM Скрипт для развертывания приложения на Windows
REM Использование: deploy.bat [vercel|netlify|docker]

echo 🚀 Начинаем развертывание приложения...

REM Проверка наличия .env файла
if not exist .env (
    echo ❌ Файл .env не найден!
    echo 📝 Создайте .env файл на основе .env.example
    pause
    exit /b 1
)

REM Установка зависимостей
echo 📦 Установка зависимостей...
call npm ci
if errorlevel 1 (
    echo ❌ Ошибка установки зависимостей!
    pause
    exit /b 1
)

REM Проверка TypeScript
echo 🔍 Проверка TypeScript...
call npx tsc --noEmit
if errorlevel 1 (
    echo ❌ Ошибки TypeScript!
    pause
    exit /b 1
)

REM Сборка приложения
echo 🔨 Сборка приложения...
call npm run build
if errorlevel 1 (
    echo ❌ Ошибка сборки приложения!
    pause
    exit /b 1
)

REM Проверка успешности сборки
if not exist build (
    echo ❌ Папка build не создана!
    pause
    exit /b 1
)

echo ✅ Приложение успешно собрано!

REM Выбор платформы развертывания
set PLATFORM=%1
if "%PLATFORM%"=="" set PLATFORM=help

if "%PLATFORM%"=="vercel" (
    echo 🌟 Развертывание на Vercel...
    
    REM Проверка Vercel CLI
    where vercel >nul 2>nul
    if errorlevel 1 (
        echo 📦 Установка Vercel CLI...
        call npm install -g vercel
    )
    
    echo 🔑 Войдите в аккаунт Vercel если еще не вошли
    call vercel login
    
    echo 🚀 Развертывание...
    call vercel --prod
    
    echo ✅ Приложение развернуто на Vercel!
    
) else if "%PLATFORM%"=="netlify" (
    echo 🔥 Развертывание на Netlify...
    
    REM Проверка Netlify CLI
    where netlify >nul 2>nul
    if errorlevel 1 (
        echo 📦 Установка Netlify CLI...
        call npm install -g netlify-cli
    )
    
    echo 🔑 Войдите в аккаунт Netlify если еще не вошли
    call netlify login
    
    echo 🚀 Развертывание...
    call netlify deploy --prod --dir=build
    
    echo ✅ Приложение развернуто на Netlify!
    
) else if "%PLATFORM%"=="docker" (
    echo 🐳 Сборка Docker образа...
    
    REM Проверка наличия Docker
    where docker >nul 2>nul
    if errorlevel 1 (
        echo ❌ Docker не установлен!
        echo 📝 Установите Docker: https://docs.docker.com/get-docker/
        pause
        exit /b 1
    )
    
    REM Сборка образа
    call docker build -t exam-management-app .
    if errorlevel 1 (
        echo ❌ Ошибка сборки Docker образа!
        pause
        exit /b 1
    )
    
    echo 🚀 Запуск контейнера...
    call docker run -d -p 8080:8080 --name exam-app exam-management-app
    
    echo ✅ Приложение запущено в Docker контейнере!
    echo 🌐 Доступно по адресу: http://localhost:8080
    
) else (
    echo 📖 Использование: deploy.bat [платформа]
    echo.
    echo Доступные платформы:
    echo   vercel   - Развертывание на Vercel рекомендуется
    echo   netlify  - Развертывание на Netlify
    echo   docker   - Запуск в Docker контейнере
    echo.
    echo Примеры:
    echo   deploy.bat vercel
    echo   deploy.bat netlify
    echo   deploy.bat docker
)

pause