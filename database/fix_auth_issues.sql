-- Диагностика и исправление проблем с auth
-- Выполнить в SQL Editor в Supabase Dashboard

-- 1. Проверяем текущее состояние auth.users
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    raw_user_meta_data,
    aud,
    role
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 2. Проверяем состояние public.users
SELECT 
    id,
    email,
    full_name,
    role,
    section_id,
    is_active,
    created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- 3. Проверяем триггеры на auth.users
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth';

-- 4. Временно отключаем триггер для диагностики
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 5. Проверяем ограничения на таблице users
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'users' 
AND table_schema = 'public';

-- 6. Проверяем внешние ключи
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

-- 7. Проверяем RLS политики
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users' 
AND schemaname = 'public';

-- 8. Тестируем создание пользователя напрямую в auth.users
-- ВНИМАНИЕ: Замените email на уникальный!
DO $$
DECLARE
    test_user_id UUID;
    test_email TEXT := 'test_' || extract(epoch from now()) || '@example.com';
BEGIN
    test_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role,
        aud
    ) VALUES (
        test_user_id,
        '00000000-0000-0000-0000-000000000000',
        test_email,
        crypt('testpassword123', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Test User", "role": "section_chief"}',
        false,
        'authenticated',
        'authenticated'
    );
    
    RAISE NOTICE 'Тестовый пользователь создан: % (ID: %)', test_email, test_user_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Ошибка создания тестового пользователя: %', SQLERRM;
END $$;