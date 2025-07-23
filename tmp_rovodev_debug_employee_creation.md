# Отладка создания работника

## Текущая ситуация
- Выполнен скрипт `tmp_rovodev_fix_employee_approval_with_exams.sql`
- Ошибка изменилась с `create_employee_with_approval` на `request_employee_creation_hook`
- Это означает, что теперь вызывается правильная функция для обычных пользователей

## Возможные причины ошибки 400:

### 1. Отсутствует функция `create_user_notification`
Функция `request_employee_creation` использует `create_user_notification`, которая может не существовать.

### 2. Отсутствуют таблицы
Могут отсутствовать таблицы `user_notifications` или `approval_requests`.

### 3. Нет прав доступа
Пользователь может не иметь прав на выполнение функций.

## Решение:

### Шаг 1: Выполните в Supabase SQL Editor
```sql
-- Проверяем существование функций
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name IN (
    'create_user_notification',
    'request_employee_creation',
    'request_employee_creation_hook',
    'create_employee_with_approval'
)
ORDER BY routine_name;
```

### Шаг 2: Проверяем таблицы
```sql
-- Проверяем существование таблиц
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('user_notifications', 'approval_requests')
AND table_schema = 'public';
```

### Шаг 3: Если что-то отсутствует, выполните
1. Полный скрипт `database/05_notifications_and_approvals.sql`
2. Или только недостающие части из `tmp_rovodev_fix_missing_functions.sql`

## Быстрое исправление:

### Вариант 1 (Рекомендуемый):
Выполните в SQL Editor код из файла `tmp_rovodev_fix_missing_functions.sql`

### Вариант 2 (Полное исправление):
Выполните полный скрипт `database/05_notifications_and_approvals.sql`

## Что исправляет скрипт:
1. Создает перегрузки функции `create_user_notification` (с 5 и 7 параметрами)
2. Обеспечивает совместимость с существующим кодом
3. Устанавливает правильные права доступа
4. Проверяет существование всех необходимых функций

## После выполнения:
- Обычные пользователи смогут отправлять запросы на создание работников
- Администраторы получат уведомления о новых запросах
- Система подтверждений будет работать корректно