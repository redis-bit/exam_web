-- Отладка проблем с уведомлениями пользователей

-- 1. Проверяем текущие RLS политики для user_notifications
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_notifications'
ORDER BY policyname;

-- 2. Проверяем включен ли RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    forcerowsecurity
FROM pg_tables 
WHERE tablename = 'user_notifications';

-- 3. Проверяем существует ли таблица user_notifications
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_notifications'
) as table_exists;

-- 4. Проверяем структуру таблицы
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_notifications' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Проверяем все уведомления в системе
SELECT 
    un.id,
    un.user_id,
    u.full_name,
    u.role,
    un.type,
    un.title,
    un.is_read,
    un.created_at
FROM user_notifications un
LEFT JOIN users u ON u.id = un.user_id
ORDER BY un.created_at DESC
LIMIT 20;

-- 6. Проверяем количество уведомлений по пользователям
SELECT 
    u.full_name,
    u.role,
    COUNT(un.id) as total_notifications,
    COUNT(CASE WHEN un.is_read = false THEN 1 END) as unread_notifications
FROM users u
LEFT JOIN user_notifications un ON u.id = un.user_id
WHERE u.is_active = true
GROUP BY u.id, u.full_name, u.role
ORDER BY total_notifications DESC;

-- 7. Тестируем доступ от имени конкретного пользователя
-- Замените USER_ID на ID проблемного пользователя
/*
SET LOCAL role TO 'authenticated';
SET LOCAL "request.jwt.claims" TO '{"sub": "USER_ID_HERE"}';

SELECT 
    id,
    type,
    title,
    is_read,
    created_at
FROM user_notifications 
WHERE user_id = 'USER_ID_HERE'
ORDER BY created_at DESC;

RESET role;
RESET "request.jwt.claims";
*/