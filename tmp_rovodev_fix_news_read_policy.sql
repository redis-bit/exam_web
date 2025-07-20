-- Исправление политики чтения новостей
-- Выполните в SQL Editor Supabase

-- 1. Проверяем текущие политики для news
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'news';

-- 2. Удаляем все существующие политики для news
DROP POLICY IF EXISTS "Authenticated users can view news" ON news;
DROP POLICY IF EXISTS "Only admins can modify news" ON news;

-- 3. Создаем простую политику для чтения - все аутентифицированные пользователи
CREATE POLICY "All authenticated users can read news" ON news
    FOR SELECT USING (true);

-- 4. Создаем политику для создания/изменения - только админы
CREATE POLICY "Only admins can create and modify news" ON news
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- 5. Проверяем новые политики
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'news';

-- 6. Тестируем чтение новостей
SELECT id, title, published_at 
FROM news 
ORDER BY published_at DESC;