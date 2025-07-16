-- Добавление созданных пользователей в систему
-- Выполните этот скрипт после создания пользователей через Authentication

-- Добавление администратора
INSERT INTO users (id, full_name, email, section_id, role) VALUES 
('dcac5330-81fb-4a0c-b57a-492169e443fe', 'Администратор Системы', 'admin@company.com', 
 (SELECT id FROM sections WHERE name = 'Участок №1 - Производство'), 'admin');

-- Добавление начальника участка
INSERT INTO users (id, full_name, email, section_id, role) VALUES 
('4f64fe5d-bea5-4811-aaff-c5babcd385e4', 'Начальник Участка №1', 'chief@company.com', 
 (SELECT id FROM sections WHERE name = 'Участок №1 - Производство'), 'section_chief');

-- Обновление author_id в новостях и форуме (устанавливаем администратора как автора)
UPDATE news SET author_id = 'dcac5330-81fb-4a0c-b57a-492169e443fe';
UPDATE forum_topics SET author_id = 'dcac5330-81fb-4a0c-b57a-492169e443fe';

-- Проверка добавленных пользователей
SELECT 
    u.full_name,
    u.email,
    u.role,
    s.name as section_name
FROM users u
JOIN sections s ON s.id = u.section_id
ORDER BY u.role;