-- Исправление real-time на уровне базы данных

-- 1. Проверяем включен ли realtime для таблицы user_notifications
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'user_notifications';

-- 2. Включаем realtime для таблицы user_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;

-- 3. Проверяем что таблица добавлена в публикацию
SELECT 
    pubname,
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE tablename = 'user_notifications';

-- 4. Полностью отключаем RLS для user_notifications (временно для тестирования)
ALTER TABLE user_notifications DISABLE ROW LEVEL SECURITY;

-- 5. Предоставляем все права
GRANT ALL ON user_notifications TO authenticated;
GRANT ALL ON user_notifications TO anon;

-- 6. Создаем тестовое уведомление для проверки real-time
INSERT INTO user_notifications (
    user_id,
    type,
    title,
    message,
    is_read
) VALUES (
    'c1419940-be86-4280-a222-378d9677d55d',
    'exam_date_approved',
    'ТЕСТ Real-Time после исправления DB',
    'Это уведомление должно появиться в real-time после исправления базы данных',
    false
);

-- 7. Проверяем результат
SELECT 
    'Результат:' as info,
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN is_read = false THEN 1 END) as unread_notifications
FROM user_notifications 
WHERE user_id = 'c1419940-be86-4280-a222-378d9677d55d';

SELECT 'Real-time должен сработать для нового уведомления!' as result;