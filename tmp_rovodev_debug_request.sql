-- Отладка функции request_employee_creation_hook

-- 1. Проверяем существование всех функций
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name IN (
    'create_user_notification',
    'request_employee_creation',
    'request_employee_creation_hook',
    'create_employee_with_approval'
)
ORDER BY routine_name;

-- 2. Проверяем существование таблиц
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_name IN ('user_notifications', 'approval_requests', 'users', 'sections', 'profession_templates')
AND table_schema = 'public'
ORDER BY table_name;

-- 3. Проверяем структуру таблицы users (роли)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Проверяем существующие роли пользователей
SELECT DISTINCT role FROM users WHERE role IS NOT NULL;

-- 5. Проверяем права доступа к функциям
SELECT 
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_name IN (
    'request_employee_creation_hook',
    'request_employee_creation',
    'create_user_notification'
)
ORDER BY routine_name, grantee;

-- 6. Тестируем функцию с фиктивными данными (замените UUID на реальные)
-- ВНИМАНИЕ: Раскомментируйте и замените UUID на реальные перед выполнением
/*
SELECT request_employee_creation_hook(
    'Тестовый Работник',
    '00000000-0000-0000-0000-000000000001'::UUID, -- замените на реальный profession_template_id
    '00000000-0000-0000-0000-000000000002'::UUID, -- замените на реальный section_id  
    '00000000-0000-0000-0000-000000000003'::UUID  -- замените на реальный user_id
);
*/