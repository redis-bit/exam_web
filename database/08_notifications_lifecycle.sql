-- Система управления жизненным циклом уведомлений
-- Выполнять в SQL Editor в Supabase Dashboard

-- 1. Добавляем поле last_viewed_at в таблицу user_notifications
ALTER TABLE user_notifications 
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;

-- 2. Функция для автоматической отметки уведомлений как прочитанных
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
$$ LANGUAGE plpgsql;

-- 3. Функция для очистки старых прочитанных уведомлений
CREATE OR REPLACE FUNCTION cleanup_old_read_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_notifications
    WHERE 
        is_read = TRUE 
        AND last_viewed_at < NOW() - INTERVAL '1 day';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Функция для получения количества непрочитанных уведомлений
CREATE OR REPLACE FUNCTION get_unread_notifications_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    count_result INTEGER;
BEGIN
    SELECT COUNT(*) INTO count_result
    FROM user_notifications
    WHERE user_id = p_user_id AND is_read = FALSE;
    
    RETURN count_result;
END;
$$ LANGUAGE plpgsql;

-- 5. Настройка автоматической очистки (запускать раз в день)
-- Примечание: Для настройки автоматической очистки требуется расширение pg_cron
-- Если расширение pg_cron не установлено, вы можете настроить очистку вручную
-- или использовать другие механизмы планирования задач

-- Вариант 1: Если у вас есть доступ к pg_cron (раскомментируйте и выполните отдельно)
/*
SELECT cron.schedule(
    'cleanup-read-notifications',
    '0 3 * * *', -- каждый день в 3:00
    'SELECT cleanup_old_read_notifications()'
);
*/

-- Вариант 2: Создаем функцию для ручного запуска очистки
CREATE OR REPLACE FUNCTION run_notifications_cleanup()
RETURNS TEXT AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    deleted_count := cleanup_old_read_notifications();
    RETURN 'Удалено ' || deleted_count || ' прочитанных уведомлений';
END;
$$ LANGUAGE plpgsql;