-- Создание функции create_local_user для исправления ошибки создания пользователей
-- Выполнить в SQL Editor в Supabase Dashboard

-- Удаляем функцию если она существует
DROP FUNCTION IF EXISTS create_local_user(TEXT, TEXT, TEXT, UUID);

-- Создаем функцию для создания пользователя только в public.users (без auth)
CREATE OR REPLACE FUNCTION create_local_user(
    user_email TEXT,
    user_full_name TEXT,
    user_role TEXT,
    user_section_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Генерируем новый UUID
    new_user_id := gen_random_uuid();
    
    -- Проверяем, что email уникален
    IF EXISTS (SELECT 1 FROM public.users WHERE email = user_email) THEN
        RAISE EXCEPTION 'Пользователь с email % уже существует', user_email;
    END IF;
    
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
        user_role::user_role,
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

-- Даем права на выполнение
GRANT EXECUTE ON FUNCTION create_local_user(TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_local_user(TEXT, TEXT, TEXT, UUID) TO anon;

-- Проверяем, что функция создана
SELECT 'Функция create_local_user успешно создана' as status;