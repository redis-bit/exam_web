-- Исправление недостающих функций для создания работников

-- 1. Создаем перегрузку функции create_user_notification с 5 параметрами
CREATE OR REPLACE FUNCTION create_user_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_related_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO user_notifications (
        user_id, type, title, message, related_id, created_at, expires_at
    ) VALUES (
        p_user_id, p_type, p_title, p_message, p_related_id, NOW(), NOW() + INTERVAL '30 days'
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Создаем полную версию функции create_user_notification с 7 параметрами
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

-- 3. Даем права на выполнение обеих версий функции
GRANT EXECUTE ON FUNCTION create_user_notification(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_notification(UUID, TEXT, TEXT, TEXT, UUID, JSONB, INTEGER) TO authenticated;

-- 3. Проверяем, что все функции существуют
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name IN (
    'create_user_notification',
    'request_employee_creation',
    'request_employee_creation_hook',
    'create_employee_with_approval'
)
ORDER BY routine_name;