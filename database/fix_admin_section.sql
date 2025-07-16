-- Исправление привязки администратора к участку
-- Администратор и помощник администратора не должны быть привязаны к конкретным участкам

-- Убираем привязку администратора к участку
UPDATE users 
SET section_id = NULL 
WHERE role = 'admin';

-- Проверяем результат
SELECT 
    u.full_name,
    u.email,
    u.role,
    COALESCE(s.name, 'Не привязан к участку') as section_name
FROM users u
LEFT JOIN sections s ON s.id = u.section_id
ORDER BY u.role;