-- Исправление RLS политик для user_notifications и approval_requests

-- 1. Включаем RLS для таблиц уведомлений (если еще не включен)
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

-- 2. Политики для user_notifications
-- Пользователи могут видеть только свои уведомления
CREATE POLICY "Users can view own notifications" ON user_notifications
    FOR SELECT USING (user_id = auth.uid());

-- Пользователи могут обновлять только свои уведомления (отмечать как прочитанные)
CREATE POLICY "Users can update own notifications" ON user_notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Пользователи могут удалять только свои уведомления
CREATE POLICY "Users can delete own notifications" ON user_notifications
    FOR DELETE USING (user_id = auth.uid());

-- Система может создавать уведомления для любого пользователя (через функции)
CREATE POLICY "System can create notifications" ON user_notifications
    FOR INSERT WITH CHECK (true);

-- Администраторы могут видеть все уведомления
CREATE POLICY "Admins can view all notifications" ON user_notifications
    FOR SELECT USING (
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'admin_assistant')
    );

-- 3. Политики для approval_requests
-- Пользователи могут видеть свои запросы
CREATE POLICY "Users can view own requests" ON approval_requests
    FOR SELECT USING (requested_by = auth.uid());

-- Пользователи могут создавать запросы
CREATE POLICY "Users can create requests" ON approval_requests
    FOR INSERT WITH CHECK (requested_by = auth.uid());

-- Администраторы могут видеть все запросы
CREATE POLICY "Admins can view all requests" ON approval_requests
    FOR SELECT USING (
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'admin_assistant')
    );

-- Администраторы могут обновлять запросы (одобрять/отклонять)
CREATE POLICY "Admins can update requests" ON approval_requests
    FOR UPDATE USING (
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'admin_assistant')
    );

-- 4. Проверяем результат
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename IN ('user_notifications', 'approval_requests')
ORDER BY tablename, policyname;