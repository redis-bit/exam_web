-- Тест системы уведомлений о новостях

-- 1. Сначала выполните основной скрипт настройки
-- tmp_rovodev_news_notifications_system.sql

-- 2. Проверяем что триггер создался
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_notify_news';

-- 3. Проверяем функцию уведомлений
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name = 'notify_users_about_news';

-- 4. Создаем тестовую новость (должна автоматически создать уведомления)
INSERT INTO news (
    title,
    content,
    author_id
) VALUES (
    'ТЕСТ: Новая система уведомлений о новостях',
    'Это тестовая новость для проверки автоматических уведомлений. Все пользователи должны получить уведомление о публикации этой новости.',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
);

-- 5. Проверяем что уведомления создались
SELECT 
    'Создано уведомлений:' as info,
    COUNT(*) as count
FROM user_notifications 
WHERE type = 'news_published' 
    AND title LIKE '%ТЕСТ: Новая система уведомлений%';

-- 6. Показываем созданные уведомления
SELECT 
    un.id,
    u.full_name as user_name,
    un.title,
    un.message,
    un.is_read,
    un.created_at
FROM user_notifications un
LEFT JOIN users u ON u.id = un.user_id
WHERE un.type = 'news_published' 
    AND un.title LIKE '%ТЕСТ: Новая система уведомлений%'
ORDER BY un.created_at DESC;

-- 7. Тестируем функцию получения последней новости
SELECT 
    'Последняя новость для пользователя:' as info;
    
SELECT * FROM get_latest_news_for_user('c1419940-be86-4280-a222-378d9677d55d');

-- 8. Тестируем отметку новости как прочитанной
SELECT mark_news_as_read(
    'c1419940-be86-4280-a222-378d9677d55d'::UUID,
    (SELECT id FROM news ORDER BY published_at DESC LIMIT 1)
) as marked_as_read;

-- 9. Проверяем что новость отмечена как прочитанная
SELECT * FROM get_latest_news_for_user('c1419940-be86-4280-a222-378d9677d55d');

SELECT 'Тест завершен! Проверьте приложение - должны появиться уведомления о новости.' as result;