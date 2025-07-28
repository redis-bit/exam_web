-- Исправление статуса прочитанности уведомлений

-- 1. Проверяем текущий статус уведомлений для пользователя
SELECT 
    id,
    title,
    is_read,
    created_at,
    last_viewed_at
FROM user_notifications 
WHERE user_id = 'c1419940-be86-4280-a222-378d9677d55d'
ORDER BY created_at DESC;

-- 2. Делаем все уведомления непрочитанными для тестирования
UPDATE user_notifications 
SET 
    is_read = false,
    last_viewed_at = NULL
WHERE user_id = 'c1419940-be86-4280-a222-378d9677d55d';

-- 3. Проверяем результат
SELECT 
    'После обновления:' as status,
    COUNT(*) as total,
    COUNT(CASE WHEN is_read = false THEN 1 END) as unread
FROM user_notifications 
WHERE user_id = 'c1419940-be86-4280-a222-378d9677d55d';

-- 4. Создаем новое тестовое уведомление
INSERT INTO user_notifications (
    user_id,
    type,
    title,
    message,
    is_read
) VALUES (
    'c1419940-be86-4280-a222-378d9677d55d',
    'exam_date_pending',
    'ТЕСТ Real-Time уведомление',
    'Это уведомление должно появиться сразу без перезагрузки!',
    false
);

SELECT 'Тестовое уведомление создано!' as result;