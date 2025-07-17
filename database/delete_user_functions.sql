-- Функции для удаления пользователей
-- Выполнить в SQL Editor в Supabase Dashboard

-- Функция для удаления пользователя из auth.users (требует прав service_role)
CREATE OR REPLACE FUNCTION delete_auth_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Удаляем из auth.identities
    DELETE FROM auth.identities WHERE user_id = $1;
    
    -- Удаляем из auth.users
    DELETE FROM auth.users WHERE id = $1;
    
    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Ошибка при удалении пользователя из auth: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для полного удаления пользователя (из обеих таблиц)
CREATE OR REPLACE FUNCTION delete_user_completely(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_email TEXT;
BEGIN
    -- Получаем email для логирования
    SELECT email INTO user_email FROM public.users WHERE id = user_id;
    
    -- Удаляем из public.users
    DELETE FROM public.users WHERE id = user_id;
    
    -- Удаляем из auth.users
    PERFORM delete_auth_user(user_id);
    
    RAISE NOTICE 'Пользователь % (%) полностью удален', user_email, user_id;
    RETURN TRUE;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Ошибка при удалении пользователя %: %', user_id, SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для очистки тестовых пользователей
CREATE OR REPLACE FUNCTION cleanup_test_users()
RETURNS TABLE(deleted_count INTEGER, deleted_emails TEXT[]) AS $$
DECLARE
    deleted_users TEXT[] := '{}';
    delete_count INTEGER := 0;
    user_record RECORD;
BEGIN
    -- Удаляем пользователей с тестовыми email'ами
    FOR user_record IN 
        SELECT id, email 
        FROM public.users 
        WHERE email LIKE '%test%' 
        OR email LIKE '%example%'
        OR email LIKE '%demo%'
    LOOP
        IF delete_user_completely(user_record.id) THEN
            deleted_users := array_append(deleted_users, user_record.email);
            delete_count := delete_count + 1;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT delete_count, deleted_users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Даем права на выполнение функций
GRANT EXECUTE ON FUNCTION delete_auth_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_completely(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_test_users() TO authenticated;