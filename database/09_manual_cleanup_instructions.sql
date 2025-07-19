-- Инструкции по ручной очистке уведомлений
-- Выполнять в SQL Editor в Supabase Dashboard

-- 1. Проверка количества прочитанных уведомлений
SELECT 
    COUNT(*) as total_notifications,
    SUM(CASE WHEN is_read = TRUE THEN 1 ELSE 0 END) as read_notifications,
    SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) as unread_notifications
FROM user_notifications;

-- 2. Проверка старых прочитанных уведомлений (старше 1 дня)
SELECT 
    COUNT(*) as old_read_notifications
FROM user_notifications
WHERE 
    is_read = TRUE 
    AND last_viewed_at < NOW() - INTERVAL '1 day';

-- 3. Запуск ручной очистки (удаление старых прочитанных уведомлений)
SELECT run_notifications_cleanup();

-- 4. Настройка периодического запуска очистки
-- Если у вас есть доступ к pg_cron, вы можете настроить автоматическую очистку:
/*
-- Сначала проверьте, установлено ли расширение pg_cron
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Если расширение установлено, настройте задачу
SELECT cron.schedule(
    'cleanup-read-notifications',
    '0 3 * * *', -- каждый день в 3:00
    'SELECT cleanup_old_read_notifications()'
);

-- Проверка запланированных задач
SELECT * FROM cron.job;
*/

-- 5. Альтернативный вариант - использование внешнего планировщика
-- Вы можете настроить регулярный HTTP запрос к вашему API, который будет вызывать функцию очистки
-- Например, с помощью сервисов cron-job.org, GitHub Actions, или других инструментов CI/CD