-- Тестирование создания работника

-- 1. Проверяем текущего пользователя и его данные
SELECT 
    id,
    email,
    full_name,
    role,
    section_id,
    is_active
FROM users 
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 5;

-- 2. Проверяем доступные участки
SELECT id, name FROM sections ORDER BY name;

-- 3. Проверяем доступные профессии
SELECT id, name FROM profession_templates ORDER BY name;

-- 4. Проверяем права на таблицы
SELECT 
    table_name,
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name IN ('user_notifications', 'approval_requests')
AND grantee = 'authenticated'
ORDER BY table_name;

-- 5. Тестируем функцию создания уведомления напрямую
-- ЗАМЕНИТЕ UUID на реальный ID пользователя
/*
SELECT create_user_notification(
    'ваш_user_id_здесь'::UUID,
    'test',
    'Тест',
    'Тестовое сообщение',
    NULL
);
*/