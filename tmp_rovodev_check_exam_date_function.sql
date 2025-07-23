-- Проверка функции request_exam_date_change

-- 1. Проверяем, существует ли функция
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'request_exam_date_change';

-- 2. Проверяем права доступа к функции
SELECT 
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'request_exam_date_change';

-- 3. Проверяем последние изменения в employee_exams
SELECT 
    ee.id,
    ee.exam_date,
    ee.pending_date,
    ee.pending_until,
    ee.updated_at,
    ee.updated_by,
    e.full_name as employee_name,
    ex.name as exam_name
FROM employee_exams ee
JOIN employees e ON e.id = ee.employee_id
JOIN exams ex ON ex.id = ee.exam_id
WHERE ee.updated_at > NOW() - INTERVAL '1 hour'
ORDER BY ee.updated_at DESC;