-- Диагностические запросы для проверки пользователей
-- Выполнить в SQL Editor в Supabase Dashboard

-- 1. Проверяем пользователей в auth.users
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC;

-- 2. Проверяем пользователей в public.users
SELECT 
    id,
    full_name,
    email,
    role,
    section_id,
    is_active,
    created_at
FROM public.users
ORDER BY created_at DESC;

-- 3. Находим пользователей из auth.users, которых нет в public.users
SELECT 
    au.id,
    au.email,
    au.email_confirmed_at,
    au.raw_user_meta_data,
    'Отсутствует в public.users' as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL 
AND au.email_confirmed_at IS NOT NULL;

-- 4. Проверяем работу функции синхронизации
SELECT sync_auth_users_to_users_table();

-- 5. Проверяем триггер
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 6. Проверяем функцию триггера
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';