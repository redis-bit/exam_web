-- Тест исправления real-time уведомлений

-- 1. Проверяем текущие уведомления пользователя
SELECT 
    'Текущие уведомления пользователя:' as info,
    COUNT(*) as total,
    COUNT(CASE WHEN is_read = false THEN 1 END) as unread
FROM user_notifications 
WHERE user_id = 'c1419940-be86-4280-a222-378d9677d55d';

-- 2. Создаем тестовое уведомление напрямую (должно сработать real-time)
INSERT INTO user_notifications (
    user_id,
    type,
    title,
    message,
    is_read
) VALUES (
    'c1419940-be86-4280-a222-378d9677d55d',
    'exam_date_approved',
    'ТЕСТ: Прямое создание уведомления',
    'Это уведомление создано напрямую в БД и должно появиться в real-time',
    false
);

-- 3. Создаем уведомление через функцию (тест функции create_user_notification)
SELECT create_user_notification(
    'c1419940-be86-4280-a222-378d9677d55d'::UUID,
    'exam_date_approved',
    'ТЕСТ: Через функцию create_user_notification',
    'Это уведомление создано через функцию и должно появиться в real-time'
) as notification_id;

-- 4. Проверяем результат
SELECT 
    'После создания тестовых уведомлений:' as info,
    COUNT(*) as total,
    COUNT(CASE WHEN is_read = false THEN 1 END) as unread
FROM user_notifications 
WHERE user_id = 'c1419940-be86-4280-a222-378d9677d55d';

-- 5. Показываем последние уведомления
SELECT 
    id,
    title,
    message,
    is_read,
    created_at
FROM user_notifications 
WHERE user_id = 'c1419940-be86-4280-a222-378d9677d55d'
ORDER BY created_at DESC
LIMIT 5;