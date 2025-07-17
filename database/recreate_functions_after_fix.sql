-- Пересоздание функций после исправления типа role
-- Выполнить ПОСЛЕ fix_role_step_by_step.sql

-- 1. Пересоздаем функцию create_local_user
CREATE OR REPLACE FUNCTION create_local_user(
    user_email TEXT,
    user_full_name TEXT,
    user_role TEXT,
    user_section_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
    role_enum user_role;
BEGIN
    -- Генерируем новый UUID
    new_user_id := gen_random_uuid();
    
    -- Проверяем, что email уникален
    IF EXISTS (SELECT 1 FROM public.users WHERE email = user_email) THEN
        RAISE EXCEPTION 'Пользователь с email % уже существует', user_email;
    END IF;
    
    -- Преобразуем текстовую роль в enum
    role_enum := CASE user_role
        WHEN 'admin' THEN 'admin'::user_role
        WHEN 'admin_assistant' THEN 'admin_assistant'::user_role
        WHEN 'section_chief' THEN 'section_chief'::user_role
        ELSE 'section_chief'::user_role
    END;
    
    -- Создаем пользователя в public.users
    INSERT INTO public.users (
        id,
        full_name,
        email,
        role,
        section_id,
        is_active,
        created_at
    ) VALUES (
        new_user_id,
        user_full_name,
        user_email,
        role_enum,
        user_section_id,
        true,
        NOW()
    );
    
    RAISE NOTICE 'Локальный пользователь создан: % (ID: %)', user_email, new_user_id;
    RETURN new_user_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Ошибка создания локального пользователя: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Пересоздаем функцию handle_new_user для триггера
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Создаем запись в таблице users для нового пользователя из auth.users
  INSERT INTO public.users (
    id,
    full_name,
    email,
    role,
    section_id,
    is_active,
    created_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Новый пользователь'),
    NEW.email,
    CASE 
      WHEN NEW.raw_user_meta_data->>'role' = 'admin' THEN 'admin'::user_role
      WHEN NEW.raw_user_meta_data->>'role' = 'admin_assistant' THEN 'admin_assistant'::user_role
      WHEN NEW.raw_user_meta_data->>'role' = 'section_chief' THEN 'section_chief'::user_role
      ELSE 'section_chief'::user_role
    END,
    CASE 
      WHEN NEW.raw_user_meta_data->>'section_id' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'section_id')::uuid
      ELSE NULL
    END,
    true,
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Пересоздаем функцию sync_auth_users_to_users_table
CREATE OR REPLACE FUNCTION sync_auth_users_to_users_table()
RETURNS TABLE(
    synced_count INTEGER,
    user_emails TEXT[]
) AS $$
DECLARE
    auth_user RECORD;
    synced_users TEXT[] := '{}';
    sync_count INTEGER := 0;
    role_enum user_role;
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
            -- Определяем роль
            role_enum := CASE 
                WHEN auth_user.raw_user_meta_data->>'role' = 'admin' THEN 'admin'::user_role
                WHEN auth_user.raw_user_meta_data->>'role' = 'admin_assistant' THEN 'admin_assistant'::user_role
                WHEN auth_user.raw_user_meta_data->>'role' = 'section_chief' THEN 'section_chief'::user_role
                ELSE 'section_chief'::user_role
            END;
            
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
                role_enum,
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

-- 4. Даем права на выполнение функций
GRANT EXECUTE ON FUNCTION create_local_user(TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_auth_users_to_users_table() TO authenticated;

-- 5. Пересоздаем триггер
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Тестируем создание локального пользователя
SELECT create_local_user(
    'final_test@example.com',
    'Финальный Тестовый Пользователь',
    'section_chief',
    NULL
);

-- 7. Тестируем синхронизацию
SELECT sync_auth_users_to_users_table();