-- Проверка RLS политик для таблицы news
-- Выполните в SQL Editor Supabase

-- 1. Проверяем, включен ли RLS для таблицы news
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'news';

-- 2. Проверяем существующие политики для news
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'news';

-- 3. Проверяем, есть ли новости в таблице
SELECT id, title, author_id, published_at 
FROM news 
ORDER BY published_at DESC;

-- 4. Проверяем текущего пользователя
SELECT auth.uid() as current_user_id;

-- 5. Проверяем роль текущего пользователя
SELECT u.id, u.full_name, u.role 
FROM users u 
WHERE u.id = auth.uid();