-- Скрипт для проверки правильности настройки базы данных
-- Выполните этот скрипт после создания всех таблиц для проверки

-- 1. Проверка созданных таблиц
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Проверка количества записей в каждой таблице
SELECT 
    'sections' as table_name, 
    COUNT(*) as record_count 
FROM sections
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL  
SELECT 'exams', COUNT(*) FROM exams
UNION ALL
SELECT 'profession_templates', COUNT(*) FROM profession_templates
UNION ALL
SELECT 'profession_exams', COUNT(*) FROM profession_exams
UNION ALL
SELECT 'employees', COUNT(*) FROM employees
UNION ALL
SELECT 'employee_exams', COUNT(*) FROM employee_exams
UNION ALL
SELECT 'news', COUNT(*) FROM news
UNION ALL
SELECT 'forum_topics', COUNT(*) FROM forum_topics
UNION ALL
SELECT 'forum_messages', COUNT(*) FROM forum_messages
UNION ALL
SELECT 'backups', COUNT(*) FROM backups
ORDER BY table_name;

-- 3. Проверка внешних ключей
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 4. Проверка RLS политик
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 5. Проверка функций
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN (
        'calculate_next_exam_date',
        'update_next_exam_date', 
        'auto_reject_pending_changes',
        'update_user_activity',
        'get_section_statistics',
        'create_employee_exams_for_profession',
        'get_user_role',
        'get_user_section_id'
    )
ORDER BY routine_name;

-- 6. Проверка представлений
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_type = 'VIEW'
ORDER BY table_name;

-- 7. Тестовый запрос для проверки связей
SELECT 
    s.name as section_name,
    COUNT(e.id) as employee_count,
    COUNT(DISTINCT pt.id) as profession_count
FROM sections s
LEFT JOIN employees e ON e.section_id = s.id
LEFT JOIN profession_templates pt ON pt.section_id = s.id
GROUP BY s.id, s.name
ORDER BY s.name;