-- Очистка тестовых данных и финальное тестирование
-- Выполнить после исправления типов

-- 1. Удаляем тестовых пользователей
DELETE FROM public.users 
WHERE email LIKE '%test%' 
OR email LIKE '%example%' 
OR email LIKE '%demo%';

-- 2. Проверяем состояние таблицы
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

-- 3. Тестируем функцию синхронизации
SELECT sync_auth_users_to_users_table();

-- 4. Проверяем пользователей из auth.users, которых нет в public.users
SELECT 
    au.id,
    au.email,
    au.email_confirmed_at,
    'Нужна синхронизация' as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL 
AND au.email_confirmed_at IS NOT NULL;

-- 5. Финальная проверка структуры
\d public.users;