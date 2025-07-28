-- Проверка и очистка старых прочитанных уведомлений

-- 1. Проверяем текущее состояние уведомлений
SELECT 
    'Всего уведомлений' as status,
    COUNT(*) as count
FROM user_notifications
UNION ALL
SELECT 
    'Прочитанных уведомлений' as status,
    COUNT(*) as count
FROM user_notifications 
WHERE is_read = true
UNION ALL
SELECT 
    'Прочитанных старше 1 дня' as status,
    COUNT(*) as count
FROM user_notifications 
WHERE is_read = true 
    AND (last_viewed_at < NOW() - INTERVAL '1 day' OR created_at < NOW() - INTERVAL '1 day')
UNION ALL
SELECT 
    'Прочитанных старше 2 дней' as status,
    COUNT(*) as count
FROM user_notifications 
WHERE is_read = true 
    AND (last_viewed_at < NOW() - INTERVAL '2 days' OR created_at < NOW() - INTERVAL '2 days');

-- 2. Показываем старые прочитанные уведомления
SELECT 
    id,
    title,
    is_read,
    created_at,
    last_viewed_at,
    CASE 
        WHEN last_viewed_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (NOW() - last_viewed_at)) / 86400
        ELSE 
            EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400
    END as days_old
FROM user_notifications 
WHERE is_read = true 
    AND (
        (last_viewed_at IS NOT NULL AND last_viewed_at < NOW() - INTERVAL '1 day') 
        OR 
        (last_viewed_at IS NULL AND created_at < NOW() - INTERVAL '1 day')
    )
ORDER BY created_at DESC;

-- 3. Запускаем очистку старых прочитанных уведомлений
SELECT cleanup_old_read_notifications() as deleted_count;

-- 4. Проверяем результат после очистки
SELECT 
    'После очистки - всего уведомлений' as status,
    COUNT(*) as count
FROM user_notifications
UNION ALL
SELECT 
    'После очистки - прочитанных уведомлений' as status,
    COUNT(*) as count
FROM user_notifications 
WHERE is_read = true;