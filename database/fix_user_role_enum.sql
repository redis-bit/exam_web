-- Исправление проблемы с типом user_role
-- Выполнить в SQL Editor в Supabase Dashboard

-- 1. Проверяем, существует ли тип user_role
SELECT typname FROM pg_type WHERE typname = 'user_role';

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

-- 3. Проверяем структуру таблицы users
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Если колонка role имеет неправильный тип, исправляем
DO $$
BEGIN
    -- Проверяем тип колонки role
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND table_schema = 'public' 
        AND column_name = 'role' 
        AND udt_name != 'user_role'
    ) THEN
        -- Изменяем тип колонки
        ALTER TABLE public.users 
        ALTER COLUMN role TYPE user_role 
        USING role::user_role;
        
        RAISE NOTICE 'Тип колонки role изменен на user_role';
    ELSE
        RAISE NOTICE 'Колонка role уже имеет правильный тип';
    END IF;
END $$;

-- 5. Пересоздаем функцию create_local_user с правильным типом
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
    
    -- Проверяем валидность роли
    IF user_role NOT IN ('admin', 'admin_assistant', 'section_chief') THEN
        RAISE EXCEPTION 'Недопустимая роль: %. Допустимые роли: admin, admin_assistant, section_chief', user_role;
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

-- 6. Тестируем создание локального пользователя
SELECT create_local_user(
    'local_test_fixed@example.com',
    'Исправленный Тестовый Пользователь',
    'section_chief',
    NULL
);

-- 7. Проверяем результат
SELECT id, full_name, email, role, section_id, is_active, created_at
FROM public.users 
WHERE email = 'local_test_fixed@example.com';