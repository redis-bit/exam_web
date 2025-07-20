-- Исправление ролей пользователей
-- Выполните в SQL Editor Supabase

-- 1. Проверяем текущих пользователей
SELECT id, full_name, email, role, section_id 
FROM users 
ORDER BY created_at;

-- 2. Создаем настоящего администратора (замените данные на реальные)
-- Вариант A: Если у вас есть отдельный email для админа
/*
INSERT INTO users (id, full_name, email, role, section_id) 
VALUES (
  'новый-uuid-для-админа',  -- Нужно будет заменить на реальный UUID из auth.users
  'Главный Администратор',
  'admin@company.com',
  'admin',
  (SELECT id FROM sections LIMIT 1)
);
*/

-- Вариант B: Оставляем текущего пользователя как админа, но понимаем это временно
-- Или меняем роль на section_chief для обычного пользователя:

-- 3. Меняем роль текущего пользователя на начальника участка
UPDATE users 
SET role = 'section_chief',
    full_name = 'Начальник Участка'
WHERE id = 'ea93334d-bd5e-4e88-a0cc-aa6240005867';

-- 4. Проверяем результат
SELECT id, full_name, email, role, section_id 
FROM users 
WHERE id = 'ea93334d-bd5e-4e88-a0cc-aa6240005867';