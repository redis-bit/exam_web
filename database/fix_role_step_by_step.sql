-- Пошаговое исправление типа колонки role
-- Выполнить в SQL Editor в Supabase Dashboard

-- 1. Создаем тип user_role, если его нет
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'admin_assistant', 'section_chief');
        RAISE NOTICE 'Тип user_role создан';
    ELSE
        RAISE NOTICE 'Тип user_role уже существует';
    END IF;
END $$;

-- 2. Проверяем текущие данные
SELECT 
    role,
    COUNT(*) as count
FROM public.users 
GROUP BY role;

-- 3. Обновляем некорректные значения (если есть)
UPDATE public.users 
SET role = 'section_chief' 
WHERE role NOT IN ('admin', 'admin_assistant', 'section_chief');

-- 4. Добавляем новую колонку с правильным типом
ALTER TABLE public.users 
ADD COLUMN role_new user_role;

-- 5. Заполняем новую колонку данными из старой
UPDATE public.users 
SET role_new = CASE 
    WHEN role::text = 'admin' THEN 'admin'::user_role
    WHEN role::text = 'admin_assistant' THEN 'admin_assistant'::user_role
    WHEN role::text = 'section_chief' THEN 'section_chief'::user_role
    ELSE 'section_chief'::user_role
END;

-- 6. Проверяем результат
SELECT 
    role as old_role,
    role_new as new_role,
    COUNT(*) as count
FROM public.users 
GROUP BY role, role_new;

-- 7. Удаляем старую колонку
ALTER TABLE public.users DROP COLUMN role;

-- 8. Переименовываем новую колонку
ALTER TABLE public.users RENAME COLUMN role_new TO role;

-- 9. Добавляем NOT NULL ограничение
ALTER TABLE public.users ALTER COLUMN role SET NOT NULL;

-- 10. Проверяем финальную структуру
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public' 
AND column_name = 'role';

-- 11. Проверяем данные
SELECT 
    id,
    full_name,
    email,
    role,
    section_id,
    is_active
FROM public.users
ORDER BY created_at DESC
LIMIT 5;