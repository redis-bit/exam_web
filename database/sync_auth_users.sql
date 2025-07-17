-- Функция для синхронизации пользователей из auth.users в users
-- Выполнить в SQL Editor в Supabase Dashboard

CREATE OR REPLACE FUNCTION sync_auth_users_to_users_table()
RETURNS TABLE(
    synced_count INTEGER,
    user_emails TEXT[]
) AS $$
DECLARE
    auth_user RECORD;
    synced_users TEXT[] := '{}';
    sync_count INTEGER := 0;
BEGIN
    -- Проходим по всем пользователям из auth.users, которых нет в users
    FOR auth_user IN 
        SELECT au.id, au.email, au.email_confirmed_at, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id = pu.id
        WHERE pu.id IS NULL 
        AND au.email_confirmed_at IS NOT NULL
        AND au.email IS NOT NULL
    LOOP
        BEGIN
            -- Добавляем пользователя в таблицу users
            INSERT INTO public.users (
                id,
                full_name,
                email,
                role,
                section_id,
                is_active,
                created_at
            ) VALUES (
                auth_user.id,
                COALESCE(
                    auth_user.raw_user_meta_data->>'full_name',
                    split_part(auth_user.email, '@', 1)
                ),
                auth_user.email,
                COALESCE(
                    auth_user.raw_user_meta_data->>'role',
                    'section_chief'
                )::user_role,
                CASE 
                    WHEN auth_user.raw_user_meta_data->>'section_id' IS NOT NULL 
                    THEN (auth_user.raw_user_meta_data->>'section_id')::uuid
                    ELSE NULL
                END,
                true,
                NOW()
            );
            
            -- Добавляем email в список синхронизированных
            synced_users := array_append(synced_users, auth_user.email);
            sync_count := sync_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            -- Игнорируем ошибки для отдельных пользователей
            RAISE NOTICE 'Ошибка при синхронизации пользователя %: %', auth_user.email, SQLERRM;
        END;
    END LOOP;
    
    RETURN QUERY SELECT sync_count, synced_users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Даем права на выполнение функции
GRANT EXECUTE ON FUNCTION sync_auth_users_to_users_table() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_auth_users_to_users_table() TO service_role;