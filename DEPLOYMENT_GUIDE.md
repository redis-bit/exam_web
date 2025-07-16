# Руководство по развертыванию системы учёта экзаменов

## Этап 7.1.2: Создание проекта в Supabase

### Шаг 1: Создание проекта
1. Перейдите на [supabase.com](https://supabase.com)
2. Нажмите "Start your project"
3. Войдите в систему или создайте аккаунт
4. Нажмите "New project"
5. Выберите организацию
6. Заполните данные проекта:
   - **Name**: exam-tracking-system
   - **Database Password**: создайте надежный пароль
   - **Region**: выберите ближайший регион
7. Нажмите "Create new project"

### Шаг 2: Получение API ключей
1. В панели Supabase перейдите в Settings → API
2. Скопируйте:
   - **Project URL** (например: https://your-project-id.supabase.co)
   - **anon/public key** (начинается с eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)

### Шаг 3: Настройка локального окружения
1. Создайте файл `.env` в корне проекта:
```bash
cp .env.example .env
```

2. Отредактируйте `.env` файл:
```
REACT_APP_SUPABASE_URL=ваш_project_url
REACT_APP_SUPABASE_ANON_KEY=ваш_anon_key
```

## Этап 7.1.3: Создание структуры базы данных

### Шаг 1: Создание таблиц
1. В панели Supabase перейдите в SQL Editor
2. Скопируйте содержимое файла `database/01_create_tables.sql`
3. Вставьте в SQL Editor и выполните (нажмите RUN)

### Шаг 2: Создание функций и триггеров
1. Скопируйте содержимое файла `database/02_functions_and_triggers.sql`
2. Вставьте в SQL Editor и выполните

### Шаг 3: Настройка Row Level Security
1. Скопируйте содержимое файла `database/03_rls_policies.sql`
2. Вставьте в SQL Editor и выполните

### Шаг 4: Добавление тестовых данных
1. Скопируйте содержимое файла `database/04_test_data.sql`
2. Вставьте в SQL Editor и выполните

## Этап 7.2.3: Настройка аутентификации

### Шаг 1: Создание тестовых пользователей
1. В панели Supabase перейдите в Authentication → Users
2. Нажмите "Add user" и создайте:

**Администратор:**
- Email: admin@company.com
- Password: Admin123!
- Email confirm: true

**Начальник участка:**
- Email: chief@company.com  
- Password: Chief123!
- Email confirm: true

**Помощник администратора:**
- Email: assistant@company.com
- Password: Assistant123!
- Email confirm: true

### Шаг 2: Добавление пользователей в таблицу users
1. В SQL Editor выполните запросы для добавления созданных пользователей:

```sql
-- Получите UUID пользователей из таблицы auth.users
SELECT id, email FROM auth.users;

-- Добавьте пользователей в таблицу users (замените UUID на реальные)
INSERT INTO users (id, full_name, email, section_id, role) VALUES 
('uuid-администратора', 'Администратор Системы', 'admin@company.com', 
 (SELECT id FROM sections WHERE name = 'Участок №1 - Производство'), 'admin');

INSERT INTO users (id, full_name, email, section_id, role) VALUES 
('uuid-начальника', 'Начальник Участка №1', 'chief@company.com', 
 (SELECT id FROM sections WHERE name = 'Участок №1 - Производство'), 'section_chief');

INSERT INTO users (id, full_name, email, section_id, role) VALUES 
('uuid-помощника', 'Помощник Администратора', 'assistant@company.com', 
 (SELECT id FROM sections WHERE name = 'Участок №1 - Производство'), 'admin_assistant');
```

## Этап 7.3.1: Запуск React приложения

### Шаг 1: Установка зависимостей
```bash
npm install
```

### Шаг 2: Запуск приложения
```bash
npm start
```

### Шаг 3: Проверка работы
1. Откройте http://localhost:3000
2. Войдите с учетными данными тестового пользователя
3. Убедитесь, что аутентификация работает

## Проверка выполнения этапов

### Уровень А: Синтаксическая корректность
- [ ] SQL скрипты выполняются без ошибок
- [ ] React приложение запускается без ошибок компиляции
- [ ] TypeScript не показывает ошибки типов

### Уровень Б: Логическая целостность
- [ ] В панели Supabase видны все 11 таблиц
- [ ] RLS включен для всех таблиц
- [ ] Связи между таблицами работают корректно

### Уровень В: Работоспособность
- [ ] Тестовые пользователи могут войти в систему
- [ ] Данные отображаются согласно ролям пользователей
- [ ] Триггеры срабатывают при изменении данных

## Следующие шаги
После успешного выполнения этих этапов можно переходить к:
- Разработке пользовательских интерфейсов
- Реализации CRUD операций
- Добавлению функционала импорта Excel
- Созданию системы уведомлений