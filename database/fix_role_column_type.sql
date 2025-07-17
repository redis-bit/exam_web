-- Исправление типа колонки role в таблице users
-- Выполнить в SQL Editor в Supabase Dashboard

-- 1. Проверяем текущий тип колонки role
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public' 
AND column_name = 'role';

-- 2. Создаем тип user_role, если его нет
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'admin_assistant', 'section_chief');
        RAISE NOTICE 'Тип user_role создан';
    ELSE
        RAISE NOTICE 'Тип user_role уже существует';
    END IF;
END $$;

-- 3. Проверяем данные в таблице users
SELECT role, COUNT(*) 
FROM public.users 
GROUP BY role;

-- 4. Безопасно изменяем тип колонки role
DO $$
DECLARE
    current_type TEXT;
BEGIN
    -- Получаем текущий тип колонки
    SELECT udt_name INTO current_type
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND table_schema = 'public' 
    AND column_name = 'role';
    
    RAISE NOTICE 'Текущий тип колонки role: %', current_type;
    
    IF current_type != 'user_role' THEN
        -- Сначала обновляем все некорректные значения
        UPDATE public.users 
        SET role = 'section_chief' 
        WHERE role NOT IN ('admin', 'admin_assistant', 'section_chief');
        
        -- Теперь изменяем тип колонки с явным приведением
        ALTER TABLE public.users 
        ALTER COLUMN role TYPE user_role 
        USING CASE 
            WHEN role = 'admin' THEN 'admin'::user_role
            WHEN role = 'admin_assistant' THEN 'admin_assistant'::user_role
            WHEN role = 'section_chief' THEN 'section_chief'::user_role
            ELSE 'section_chief'::user_role
        END;
        
        RAISE NOTICE 'Тип колонки role изменен на user_role';
    ELSE
        RAISE NOTICE 'Колонка role уже имеет тип user_role';
    END IF;
END $$;

-- 5. Проверяем результат
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public' 
AND column_name = 'role';

-- 6. Пересоздаем функцию create_local_user
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

-- Даем права на выполнение
GRANT EXECUTE ON FUNCTION create_local_user(TEXT, TEXT, TEXT, UUID) TO authenticated;

-- 7. Тестируем создание локального пользователя
SELECT create_local_user(
    'test_role_fixed@example.com',
    'Пользователь с исправленной ролью',
    'section_chief',
    NULL
);

-- 8. Проверяем результат
SELECT id, full_name, email, role, section_id, is_active, created_at
FROM public.users 
WHERE email = 'test_role_fixed@example.com';