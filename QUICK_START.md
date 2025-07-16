# Быстрый старт - Развертывание системы учёта экзаменов

## 🚀 Пошаговая инструкция

### 1. Создание проекта в Supabase (5 минут)
1. Откройте [supabase.com](https://supabase.com)
2. Войдите или зарегистрируйтесь
3. Нажмите **"New project"**
4. Заполните:
   - Name: `exam-tracking-system`
   - Database Password: `ExamSystem2024!` (или свой надежный пароль)
   - Region: выберите ближайший
5. Нажмите **"Create new project"**
6. Дождитесь создания (1-2 минуты)

### 2. Получение API ключей (1 минута)
1. В проекте перейдите: **Settings** → **API**
2. Скопируйте:
   - **Project URL** (например: `https://abcdefgh.supabase.co`)
   - **anon public key** (длинная строка)

### 3. Настройка локального проекта (2 минуты)
1. Откройте файл `.env` в корне проекта
2. Замените значения на ваши:
```env
REACT_APP_SUPABASE_URL=https://ваш-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=ваш_anon_key
```

### 4. Создание базы данных (5 минут)
1. В Supabase перейдите в **SQL Editor**
2. Выполните скрипты по порядку:

#### Скрипт 1: Таблицы
- Откройте файл `database/01_create_tables.sql`
- Скопируйте весь код
- Вставьте в SQL Editor
- Нажмите **RUN**

#### Скрипт 2: Функции
- Откройте файл `database/02_functions_and_triggers.sql`
- Скопируйте и выполните

#### Скрипт 3: Безопасность
- Откройте файл `database/03_rls_policies.sql`
- Скопируйте и выполните

#### Скрипт 4: Тестовые данные
- Откройте файл `database/04_test_data.sql`
- Скопируйте и выполните

### 5. Проверка базы данных (2 минуты)
1. В SQL Editor выполните проверочный скрипт:
- Откройте файл `database/verify_setup.sql`
- Скопируйте и выполните
- Убедитесь, что все таблицы созданы

2. В **Table Editor** должны быть видны все 11 таблиц:
   - sections, users, exams, profession_templates, profession_exams
   - employees, employee_exams, news, backups
   - forum_topics, forum_messages

### 6. Создание тестовых пользователей (3 минуты)
1. Перейдите в **Authentication** → **Users**
2. Нажмите **"Add user"** и создайте:

**Администратор:**
- Email: `admin@company.com`
- Password: `Admin123!`
- Email confirm: ✅

**Начальник участка:**
- Email: `chief@company.com`
- Password: `Chief123!`
- Email confirm: ✅

3. Добавьте пользователей в таблицу users:
```sql
-- Получите UUID пользователей
SELECT id, email FROM auth.users;

-- Добавьте их в таблицу users (замените UUID на реальные)
INSERT INTO users (id, full_name, email, section_id, role) VALUES 
('uuid-администратора', 'Администратор Системы', 'admin@company.com', 
 (SELECT id FROM sections WHERE name = 'Участок №1 - Производство'), 'admin');

INSERT INTO users (id, full_name, email, section_id, role) VALUES 
('uuid-начальника', 'Начальник Участка №1', 'chief@company.com', 
 (SELECT id FROM sections WHERE name = 'Участок №1 - Производство'), 'section_chief');
```

### 7. Запуск приложения (2 минуты)
```bash
# Установка зависимостей
npm install

# Запуск приложения
npm start
```

### 8. Тестирование (2 минуты)
1. Откройте http://localhost:3000
2. Войдите с данными: `admin@company.com` / `Admin123!`
3. Проверьте статус подключения в Dashboard
4. Нажмите "Проверить подключение заново"
5. Откройте консоль браузера (F12) для просмотра результатов тестирования

## ✅ Критерии успешного развертывания

- [ ] Проект создан в Supabase
- [ ] API ключи настроены в .env
- [ ] Все 4 SQL скрипта выполнены без ошибок
- [ ] В Table Editor видны все 11 таблиц
- [ ] Созданы тестовые пользователи
- [ ] React приложение запускается
- [ ] Аутентификация работает
- [ ] Dashboard показывает "База данных подключена"

## 🔧 Решение проблем

**Ошибка "Invalid API key"**
- Проверьте правильность REACT_APP_SUPABASE_URL и REACT_APP_SUPABASE_ANON_KEY

**Ошибка "relation does not exist"**
- Убедитесь, что выполнили все SQL скрипты по порядку

**Ошибка "permission denied"**
- Проверьте, что используете правильный проект в Supabase

**Приложение не запускается**
- Выполните `npm install` заново
- Проверьте, что файл .env настроен правильно

## 📞 Что дальше?

После успешного развертывания можно переходить к:
- Разработке пользовательских интерфейсов
- Реализации CRUD операций
- Добавлению функционала импорта Excel
- Созданию системы уведомлений

**Общее время развертывания: ~20 минут**