# 🚀 Быстрое руководство по развертыванию

## 📋 Предварительные требования

1. ✅ Проект собирается локально (`npm run build`)
2. ✅ Настроен файл `.env` с переменными Supabase
3. ✅ Выполнены исправления безопасности из `tmp_rovodev_execute_security_fixes.sql`

## 🎯 Рекомендуемый способ: Vercel (БЕСПЛАТНО)

### Шаг 1: Подготовка
```bash
# Убедитесь что проект собирается
npm run build

# Проверьте .env файл
cat .env
```

### Шаг 2: Автоматическое развертывание
```bash
# Linux/Mac
chmod +x deploy.sh
./deploy.sh vercel

# Windows
deploy.bat vercel
```

### Шаг 3: Настройка переменных в Vercel
1. Перейдите в [Vercel Dashboard](https://vercel.com/dashboard)
2. Выберите ваш проект
3. Settings → Environment Variables
4. Добавьте:
   - `REACT_APP_SUPABASE_URL` = ваш URL
   - `REACT_APP_SUPABASE_ANON_KEY` = ваш ключ

## 🔥 Альтернатива: Netlify (БЕСПЛАТНО)

### Автоматическое развертывание:
```bash
# Linux/Mac
./deploy.sh netlify

# Windows  
deploy.bat netlify
```

### Ручное развертывание:
1. Соберите проект: `npm run build`
2. Перейдите на [netlify.com](https://netlify.com)
3. Перетащите папку `build` в область "Deploy"
4. Настройте переменные окружения в Site Settings

## 🐳 Docker развертывание

### Локальный запуск:
```bash
# Автоматически
./deploy.sh docker

# Или вручную
docker build -t exam-app .
docker run -p 8080:8080 exam-app
```

### На сервере:
```bash
# Клонируйте репозиторий
git clone your-repo-url
cd your-project

# Создайте .env файл
cp .env.example .env
# Отредактируйте .env

# Запустите
./deploy.sh docker
```

## 🌐 Настройка домена

### Для Vercel:
1. Domains → Add Domain
2. Настройте DNS записи у регистратора
3. HTTPS настроится автоматически

### Для Netlify:
1. Domain settings → Add custom domain  
2. Настройте DNS записи
3. SSL сертификат выдается автоматически

## 🔒 Безопасность после развертывания

### 1. Настройте CORS в Supabase:
1. Supabase Dashboard → Settings → API
2. Добавьте ваш домен в "CORS origins"

### 2. Включите защиту паролей:
1. Supabase Dashboard → Authentication → Settings
2. Включите "Leaked Password Protection"

### 3. Настройте MFA:
1. Authentication → Settings → Multi-Factor Authentication
2. Включите TOTP и другие методы

## 📊 Проверка развертывания

### Чек-лист:
- [ ] Сайт открывается без ошибок
- [ ] Аутентификация работает
- [ ] Данные загружаются
- [ ] Мобильная версия работает
- [ ] HTTPS активен
- [ ] Переменные окружения настроены

### Команды для проверки:
```bash
# Проверка доступности
curl -I https://your-domain.com

# Проверка переменных (в браузере)
console.log(process.env.REACT_APP_SUPABASE_URL)
```

## 🚨 Решение проблем

### Ошибка сборки:
```bash
# Очистите кэш
npm ci
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Ошибки аутентификации:
1. Проверьте переменные окружения
2. Проверьте CORS в Supabase
3. Проверьте RLS политики

### Ошибки загрузки данных:
1. Проверьте подключение к Supabase
2. Проверьте права пользователей
3. Проверьте SQL функции

## 📱 Мобильная оптимизация

Приложение автоматически адаптируется под мобильные устройства благодаря:
- Responsive CSS
- Touch-friendly интерфейс
- Оптимизированные изображения
- PWA возможности

## 🔄 Автоматические обновления

### GitHub Actions (опционально):
Создайте `.github/workflows/deploy.yml`:
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи в консоли браузера
2. Проверьте логи платформы развертывания
3. Убедитесь что все переменные окружения настроены
4. Проверьте статус Supabase сервисов

---

**🎉 Поздравляем! Ваше приложение готово к использованию!**

Теперь пользователи могут получить доступ к системе учета экзаменов через интернет.