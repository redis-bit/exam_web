-- Проверка RLS политик для user_notifications

-- 1. Проверяем существующие политики
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

-- 3. Проверяем права доступа к таблице
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'user_notifications'
ORDER BY grantee, privilege_type;

-- 4. Тестируем создание уведомления для обычного пользователя
-- (замените USER_ID на реальный ID пользователя)
/*
INSERT INTO user_notifications (
    user_id,
    type,
    title,
    message
) VALUES (
    'USER_ID_HERE', -- замените на реальный ID пользователя
    'exam_date_pending',
    'Тестовое уведомление',
    'Это тестовое уведомление для проверки real-time'
);
*/

-- 5. Проверяем функции уведомлений
SELECT 
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines 
WHERE routine_name LIKE '%notification%'
ORDER BY routine_name;