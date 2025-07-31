-- Исправление ошибки: cannot change return type of existing function
-- Сначала удаляем существующие функции, затем создаем заново

-- 1. Удаляем существующие функции
DROP FUNCTION IF EXISTS cleanup_old_read_notifications();
DROP FUNCTION IF EXISTS force_cleanup_old_notifications();
DROP FUNCTION IF EXISTS maintenance_cleanup_notifications();
DROP FUNCTION IF EXISTS update_notification_viewed(UUID);
DROP FUNCTION IF EXISTS mark_notifications_as_read(UUID);

-- 2. Создаем функции заново с правильными типами возврата

-- Функция очистки с возвратом статистики
CREATE OR REPLACE FUNCTION cleanup_old_read_notifications()
RETURNS TABLE(deleted_count INTEGER, details TEXT) AS $$
DECLARE
    deleted_count INTEGER;
    details_text TEXT;
BEGIN
    -- Удаляем прочитанные уведомления старше 1 дня
    DELETE FROM user_notifications
    WHERE 
        is_read = TRUE 
        AND (
            last_viewed_at < NOW() - INTERVAL '1 day'
            OR (last_viewed_at IS NULL AND created_at < NOW() - INTERVAL '1 day')
        );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    details_text := 'Удалено ' || deleted_count || ' прочитанных уведомлений старше 1 дня на ' || NOW()::TEXT;
    
    -- Логируем результат
    RAISE NOTICE '%', details_text;
    
    RETURN QUERY SELECT deleted_count, details_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для принудительной очистки всех старых уведомлений
CREATE OR REPLACE FUNCTION force_cleanup_old_notifications()
RETURNS TABLE(deleted_count INTEGER, details TEXT) AS $$
DECLARE
    deleted_count INTEGER;
    details_text TEXT;
BEGIN
    -- Удаляем ВСЕ уведомления старше 2 дней (независимо от статуса прочтения)
    DELETE FROM user_notifications
    WHERE created_at < NOW() - INTERVAL '2 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    details_text := 'Принудительно удалено ' || deleted_count || ' уведомлений старше 2 дней на ' || NOW()::TEXT;
    
    RAISE NOTICE '%', details_text;
    
    RETURN QUERY SELECT deleted_count, details_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для обновления статуса прочтения с last_viewed_at
CREATE OR REPLACE FUNCTION update_notification_viewed(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user_notifications
    SET 
        is_read = TRUE,
        last_viewed_at = NOW()
    WHERE id = notification_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для массовой отметки как прочитанных
CREATE OR REPLACE FUNCTION mark_notifications_as_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE user_notifications
    SET 
        is_read = TRUE,
        last_viewed_at = NOW()
    WHERE 
        user_id = p_user_id 
        AND is_read = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для автоматического обновления last_viewed_at
CREATE OR REPLACE FUNCTION trigger_update_last_viewed()
RETURNS TRIGGER AS $$
BEGIN
    -- Если уведомление помечается как прочитанное, обновляем last_viewed_at
    IF NEW.is_read = TRUE AND OLD.is_read = FALSE THEN
        NEW.last_viewed_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер
DROP TRIGGER IF EXISTS update_last_viewed_trigger ON user_notifications;
CREATE TRIGGER update_last_viewed_trigger
    BEFORE UPDATE ON user_notifications
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_last_viewed();

-- ГЛАВНАЯ ФУНКЦИЯ - создаем функцию для регулярного вызова из приложения
CREATE OR REPLACE FUNCTION maintenance_cleanup_notifications()
RETURNS JSON AS $$
DECLARE
    cleanup_result RECORD;
    result JSON;
BEGIN
    -- Выполняем очистку
    SELECT * INTO cleanup_result FROM cleanup_old_read_notifications() LIMIT 1;
    
    -- Формируем результат
    result := json_build_object(
        'success', true,
        'deleted_count', cleanup_result.deleted_count,
        'message', cleanup_result.details,
        'timestamp', NOW()
    );
    
    RETURN result;
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Предоставляем права на выполнение функций
GRANT EXECUTE ON FUNCTION cleanup_old_read_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION force_cleanup_old_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION update_notification_viewed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notifications_as_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION maintenance_cleanup_notifications() TO authenticated;

-- Добавляем поле last_viewed_at если его нет
ALTER TABLE user_notifications 
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;

-- Тестируем основную функцию
SELECT maintenance_cleanup_notifications();

-- Показываем статистику
SELECT 
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE is_read = true) as read_notifications,
    COUNT(*) FILTER (WHERE is_read = false) as unread_notifications,
    COUNT(*) FILTER (WHERE is_read = true AND created_at < NOW() - INTERVAL '1 day') as old_read_notifications
FROM user_notifications;