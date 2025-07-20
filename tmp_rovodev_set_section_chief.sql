-- Изменение роли пользователя на section_chief (строго по ТЗ)
-- Выполните в SQL Editor Supabase

-- 1. Проверяем текущую роль
SELECT id, full_name, email, role, section_id 
FROM users 
WHERE id = 'ea93334d-bd5e-4e88-a0cc-aa6240005867';

-- 2. Меняем роль на section_chief (начальник участка)
UPDATE users 
SET role = 'section_chief',
    full_name = 'Начальник Участка'
WHERE id = 'ea93334d-bd5e-4e88-a0cc-aa6240005867';

-- 3. Проверяем результат
SELECT id, full_name, email, role, section_id 
FROM users 
WHERE id = 'ea93334d-bd5e-4e88-a0cc-aa6240005867';

-- 4. Проверяем, что у пользователя есть section_id (нужен для работы)
-- Если section_id = null, устанавливаем первый доступный участок
UPDATE users 
SET section_id = (SELECT id FROM sections LIMIT 1)
WHERE id = 'ea93334d-bd5e-4e88-a0cc-aa6240005867' 
AND section_id IS NULL;