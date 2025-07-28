-- Быстрое исправление RLS для user_notifications

-- 1. Проверяем текущее состояние
SELECT 'Текущие политики:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'user_notifications';

SELECT 'RLS включен:' as info;
SELECT rowsecurity FROM pg_tables WHERE tablename = 'user_notifications';

-- 2. Удаляем все существующие политики
DROP POLICY IF EXISTS "Users can view own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON user_notifications;
DROP POLICY IF EXISTS "System can create notifications" ON user_notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON user_notifications;

-- 3. Временно отключаем RLS
ALTER TABLE user_notifications DISABLE ROW LEVEL SECURITY;

-- 4. Проверяем что отключилось
SELECT 'RLS после отключения:' as info;
SELECT rowsecurity FROM pg_tables WHERE tablename = 'user_notifications';

-- 5. Предоставляем права
GRANT ALL ON user_notifications TO authenticated;

SELECT 'Исправление завершено. Проверьте real-time уведомления.' as result;