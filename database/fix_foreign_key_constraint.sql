-- Исправление проблемы с внешним ключом users_id_fkey
-- Выполнить в SQL Editor в Supabase Dashboard

-- 1. Проверяем внешние ключи на таблице users
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'users'
AND tc.table_schema = 'public';

-- 2. Временно удаляем внешний ключ users_id_fkey (если он существует)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_id_fkey' 
        AND table_name = 'users' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users DROP CONSTRAINT users_id_fkey;
        RAISE NOTICE 'Внешний ключ users_id_fkey удален';
    ELSE
        RAISE NOTICE 'Внешний ключ users_id_fkey не найден';
    END IF;
END $$;

-- 3. Проверяем, какие еще внешние ключи есть на колонке id
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND constraint_type = 'FOREIGN KEY';

-- 4. Удаляем все внешние ключи на колонке id (если есть)
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    FOR constraint_rec IN 
        SELECT tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'users'
        AND tc.table_schema = 'public'
        AND kcu.column_name = 'id'
    LOOP
        EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT ' || constraint_rec.constraint_name;
        RAISE NOTICE 'Удален внешний ключ: %', constraint_rec.constraint_name;
    END LOOP;
END $$;

-- 5. Теперь пересоздаем функцию create_local_user
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
    
    -- Создаем пользователя в public.users БЕЗ внешнего ключа
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

-- 6. Даем права на выполнение
GRANT EXECUTE ON FUNCTION create_local_user(TEXT, TEXT, TEXT, UUID) TO authenticated;

-- 7. Тестируем создание локального пользователя
SELECT create_local_user(
    'test_no_fk@example.com',
    'Тестовый пользователь без FK',
    'section_chief',
    NULL
);

-- 8. Проверяем результат
SELECT id, full_name, email, role, section_id, is_active, created_at
FROM public.users 
WHERE email = 'test_no_fk@example.com';