-- Тест уведомлений после исправления RLS

-- 1. Создаем тестовое уведомление для конкретного пользователя
-- ЗАМЕНИТЕ 'USER_ID_HERE' на реальный ID пользователя из таблицы users
INSERT INTO user_notifications (
    user_id,
    type,
    title,
    message
) VALUES (
    'USER_ID_HERE', -- ЗАМЕНИТЕ НА РЕАЛЬНЫЙ ID
    'exam_date_pending',
    'Тестовое real-time уведомление',
    'Это уведомление должно появиться сразу без перезагрузки страницы'
);

-- 2. Проверяем, что уведомление создалось
SELECT 
    id,
    user_id,
    title,
    message,
    is_read,
    created_at
FROM user_notifications 
WHERE title = 'Тестовое real-time уведомление'
ORDER BY created_at DESC;

-- 3. Получаем список всех пользователей для справки
SELECT 
    id,
    full_name,
    email,
    role
FROM users 
WHERE is_active = true
ORDER BY full_name;