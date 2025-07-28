-- Временное отключение RLS для user_notifications для тестирования

-- 1. ВРЕМЕННО отключаем RLS для user_notifications
ALTER TABLE user_notifications DISABLE ROW LEVEL SECURITY;

-- 2. Проверяем что RLS отключен
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    forcerowsecurity
FROM pg_tables 
WHERE tablename = 'user_notifications';

-- 3. Удаляем все существующие политики
DROP POLICY IF EXISTS "Users can view own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON user_notifications;
DROP POLICY IF EXISTS "System can create notifications" ON user_notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON user_notifications;

-- 4. Предоставляем полные права на таблицу для authenticated роли
GRANT ALL ON user_notifications TO authenticated;
GRANT ALL ON user_notifications TO anon;

-- 5. Проверяем права доступа
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'user_notifications'
ORDER BY grantee, privilege_type;

-- ВНИМАНИЕ: Это временное решение для тестирования!
-- После подтверждения что real-time работает, нужно будет 
-- включить RLS обратно и настроить правильные политики