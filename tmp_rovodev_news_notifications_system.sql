-- Система уведомлений о новостях

-- 1. Создаем функцию для отправки уведомлений о новой новости всем пользователям
CREATE OR REPLACE FUNCTION notify_users_about_news()
RETURNS TRIGGER AS $$
DECLARE
    news_record RECORD;
    user_record RECORD;
BEGIN
    -- Получаем данные новости
    SELECT 
        n.id,
        n.title,
        n.content,
        u.full_name as author_name
    INTO news_record
    FROM news n
    LEFT JOIN users u ON u.id = n.author_id
    WHERE n.id = NEW.id;
    
    -- Создаем уведомления для всех активных пользователей (кроме автора)
    FOR user_record IN 
        SELECT id FROM users 
        WHERE is_active = true 
        AND id != NEW.author_id
    LOOP
        INSERT INTO user_notifications (
            user_id,
            type,
            title,
            message,
            related_id,
            action_data
        ) VALUES (
            user_record.id,
            'news_published',
            'Новая новость: ' || news_record.title,
            'Опубликована новая новость "' || news_record.title || '" от ' || COALESCE(news_record.author_name, 'администратора') || '. ' || 
            CASE 
                WHEN LENGTH(news_record.content) > 100 
                THEN SUBSTRING(news_record.content FROM 1 FOR 100) || '...'
                ELSE news_record.content
            END,
            news_record.id,
            jsonb_build_object(
                'news_id', news_record.id,
                'news_title', news_record.title,
                'author_name', news_record.author_name
            )
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Создаем триггер для автоматической отправки уведомлений при создании новости
DROP TRIGGER IF EXISTS trigger_notify_news ON news;
CREATE TRIGGER trigger_notify_news
    AFTER INSERT ON news
    FOR EACH ROW
    EXECUTE FUNCTION notify_users_about_news();

-- 3. Добавляем новый тип уведомления в проверку
ALTER TABLE user_notifications 
DROP CONSTRAINT IF EXISTS user_notifications_type_check;

ALTER TABLE user_notifications 
ADD CONSTRAINT user_notifications_type_check 
CHECK (type IN (
    'exam_date_pending', 
    'exam_date_approved', 
    'exam_date_rejected', 
    'employee_created_pending', 
    'employee_approved', 
    'employee_rejected',
    'news_published'
));

-- 4. Создаем таблицу для отслеживания прочитанных новостей
CREATE TABLE IF NOT EXISTS user_news_read (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    news_id UUID REFERENCES news(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, news_id)
);

-- 5. Функция для отметки новости как прочитанной
CREATE OR REPLACE FUNCTION mark_news_as_read(
    p_user_id UUID,
    p_news_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO user_news_read (user_id, news_id)
    VALUES (p_user_id, p_news_id)
    ON CONFLICT (user_id, news_id) 
    DO UPDATE SET read_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 6. Функция для получения последней новости с информацией о прочтении
CREATE OR REPLACE FUNCTION get_latest_news_for_user(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    published_at TIMESTAMPTZ,
    author_name TEXT,
    is_read BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.title,
        n.content,
        n.published_at,
        u.full_name as author_name,
        CASE WHEN unr.news_id IS NOT NULL THEN TRUE ELSE FALSE END as is_read
    FROM news n
    LEFT JOIN users u ON u.id = n.author_id
    LEFT JOIN user_news_read unr ON unr.news_id = n.id AND unr.user_id = p_user_id
    ORDER BY n.published_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 7. Предоставляем права на новые функции
GRANT EXECUTE ON FUNCTION mark_news_as_read(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_news_for_user(UUID) TO authenticated;
GRANT ALL ON user_news_read TO authenticated;

-- 8. Включаем RLS для новой таблицы
ALTER TABLE user_news_read ENABLE ROW LEVEL SECURITY;

-- Политика для чтения своих записей
CREATE POLICY "users_read_own_news_read" ON user_news_read
    FOR SELECT USING (user_id = auth.uid());

-- Политика для создания своих записей
CREATE POLICY "users_create_own_news_read" ON user_news_read
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Политика для обновления своих записей
CREATE POLICY "users_update_own_news_read" ON user_news_read
    FOR UPDATE USING (user_id = auth.uid());

SELECT 'Система уведомлений о новостях настроена!' as result;