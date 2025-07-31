-- Функции для отслеживания активности пользователей
-- Выполнить в SQL Editor в Supabase Dashboard

-- Функция для обновления времени последнего визита
CREATE OR REPLACE FUNCTION update_user_last_visit(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users 
    SET last_visit_at = NOW()
    WHERE id = user_id;
    
    -- Возвращаем true если обновление прошло успешно
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для обновления времени последнего действия
CREATE OR REPLACE FUNCTION update_user_last_action(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users 
    SET last_action_at = NOW(),
        activity_rating = activity_rating + 1
    WHERE id = user_id;
    
    -- Возвращаем true если обновление прошло успешно
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для синхронизации времени последнего входа из auth.users
CREATE OR REPLACE FUNCTION sync_last_sign_in_times()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
    auth_user RECORD;
BEGIN
    -- Проходим по всем пользователям из auth.users и обновляем last_visit_at
    FOR auth_user IN 
        SELECT au.id, au.last_sign_in_at
        FROM auth.users au
        INNER JOIN public.users pu ON au.id = pu.id
        WHERE au.last_sign_in_at IS NOT NULL
    LOOP
        -- Обновляем время последнего визита, если оно отличается
        UPDATE public.users 
        SET last_visit_at = auth_user.last_sign_in_at
        WHERE id = auth_user.id 
        AND (last_visit_at IS NULL OR last_visit_at != auth_user.last_sign_in_at);
        
        IF FOUND THEN
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения статистики активности пользователей (для админа)
CREATE OR REPLACE FUNCTION get_users_activity_stats()
RETURNS TABLE(
    user_id UUID,
    full_name TEXT,
    email TEXT,
    role TEXT,
    section_name TEXT,
    last_visit_at TIMESTAMPTZ,
    last_action_at TIMESTAMPTZ,
    activity_rating INTEGER,
    days_since_last_visit INTEGER,
    days_since_last_action INTEGER,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.full_name,
        u.email,
        u.role::TEXT,
        COALESCE(s.name, 'Не назначен') as section_name,
        u.last_visit_at,
        u.last_action_at,
        u.activity_rating,
        CASE 
            WHEN u.last_visit_at IS NOT NULL 
            THEN EXTRACT(days FROM NOW() - u.last_visit_at)::INTEGER
            ELSE NULL
        END as days_since_last_visit,
        CASE 
            WHEN u.last_action_at IS NOT NULL 
            THEN EXTRACT(days FROM NOW() - u.last_action_at)::INTEGER
            ELSE NULL
        END as days_since_last_action,
        u.is_active
    FROM users u
    LEFT JOIN sections s ON s.id = u.section_id
    ORDER BY u.last_visit_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Даем права на выполнение функций
GRANT EXECUTE ON FUNCTION update_user_last_visit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_last_action(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_last_sign_in_times() TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_activity_stats() TO authenticated;

-- Даем права service_role для административных операций
GRANT EXECUTE ON FUNCTION update_user_last_visit(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION update_user_last_action(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION sync_last_sign_in_times() TO service_role;
GRANT EXECUTE ON FUNCTION get_users_activity_stats() TO service_role;