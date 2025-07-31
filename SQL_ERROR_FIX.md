# ✅ ИСПРАВЛЕНИЕ ОШИБКИ SQL: "column specified more than once"

## 🔍 Проблема:
```
ERROR: 42701: column "employees_created" specified more than once
```

Эта ошибка возникает когда пытаемся добавить колонку, которая уже существует в таблице.

## ✅ Решение:

### 1. Создан исправленный SQL скрипт
**Файл:** `database/fix_user_activity_counters.sql`

**Ключевые улучшения:**
- ✅ Проверка существования колонок перед добавлением
- ✅ Информативные сообщения о процессе выполнения
- ✅ Безопасное создание функций с `CREATE OR REPLACE`
- ✅ Безопасное создание представления с `DROP IF EXISTS`

### 2. Логика проверки колонок
```sql
DO $$ 
BEGIN
    -- Проверяем существование колонки
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'employees_created') THEN
        ALTER TABLE users ADD COLUMN employees_created INTEGER DEFAULT 0;
        RAISE NOTICE 'Добавлена колонка employees_created';
    ELSE
        RAISE NOTICE 'Колонка employees_created уже существует';
    END IF;
END $$;
```

### 3. Обновленный основной скрипт
Также обновлен файл `database/add_user_activity_counters.sql` с безопасной логикой.

## 🚀 Инструкция по применению:

### Вариант 1: Использовать исправленный скрипт
```sql
-- Выполнить в Supabase SQL Editor:
-- Содержимое файла database/fix_user_activity_counters.sql
```

### Вариант 2: Если колонки уже существуют
Если колонки уже добавлены, можно выполнить только создание функций и представления:

```sql
-- Создать только функции и представление
CREATE OR REPLACE FUNCTION increment_user_employees_created(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET employees_created = COALESCE(employees_created, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ... остальные функции и представление
```

## 🔧 Что делает исправленный скрипт:

### Безопасное добавление колонок:
- ✅ Проверяет существование каждой колонки
- ✅ Добавляет только отсутствующие колонки
- ✅ Выводит информативные сообщения

### Создание функций:
- ✅ `increment_user_employees_created()`
- ✅ `increment_user_exam_dates_approved()`
- ✅ `increment_user_requests_rejected()`

### Создание триггера:
- ✅ Автоматический подсчет созданных работников
- ✅ Безопасное пересоздание триггера

### Создание представления:
- ✅ `users_with_activity_stats` с полной информацией
- ✅ Безопасное пересоздание представления

### Инициализация данных:
- ✅ Установка нулевых значений для существующих пользователей
- ✅ Обработка NULL значений

## 📊 Ожидаемый результат:

### При выполнении скрипта увидите:
```
NOTICE: Колонка employees_created уже существует
NOTICE: Добавлена колонка exam_dates_approved  
NOTICE: Добавлена колонка requests_rejected
NOTICE: Скрипт успешно выполнен!
```

### После выполнения:
- ✅ Все необходимые колонки добавлены
- ✅ Функции инкремента созданы
- ✅ Триггер настроен
- ✅ Представление работает
- ✅ Интерфейс отображает счетчики

## ✅ Статус: ГОТОВО К ПРИМЕНЕНИЮ

Исправленный скрипт безопасно добавит недостающие элементы без ошибок дублирования колонок.