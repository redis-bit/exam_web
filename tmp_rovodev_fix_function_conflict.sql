-- Исправление конфликта функций create_user_notification

-- 1. Удаляем все существующие версии функции
DROP FUNCTION IF EXISTS create_user_notification(UUID, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS create_user_notification(UUID, TEXT, TEXT, TEXT, UUID, JSONB, INTEGER);

-- 2. Создаем только одну универсальную версию с явными типами
CREATE OR REPLACE FUNCTION create_user_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_related_id UUID DEFAULT NULL,
    p_action_data JSONB DEFAULT NULL,
    p_expires_days INTEGER DEFAULT 30
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO user_notifications (
        user_id, type, title, message, related_id, action_data, expires_at
    ) VALUES (
        p_user_id, p_type, p_title, p_message, p_related_id, p_action_data,
        NOW() + INTERVAL '1 day' * p_expires_days
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Даем права на выполнение
GRANT EXECUTE ON FUNCTION create_user_notification(UUID, TEXT, TEXT, TEXT, UUID, JSONB, INTEGER) TO authenticated;

-- 4. Проверяем, что функция создана правильно
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'create_user_notification'
ORDER BY routine_name;