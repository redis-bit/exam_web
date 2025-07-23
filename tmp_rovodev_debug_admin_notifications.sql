-- Отладка уведомлений для администратора

-- 1. Проверяем, есть ли запросы на подтверждение в базе
SELECT 
    ar.id,
    ar.type,
    ar.status,
    ar.created_at,
    ar.expires_at,
    u.full_name as requester_name,
    u.email as requester_email,
    ar.old_value,
    ar.new_value
FROM approval_requests ar
JOIN users u ON u.id = ar.requested_by
WHERE ar.status = 'pending'
ORDER BY ar.created_at DESC;

-- 2. Проверяем уведомления для администраторов
SELECT 
    un.id,
    un.type,
    un.title,
    un.message,
    un.is_read,
    un.created_at,
    u.full_name as admin_name,
    u.role as admin_role
FROM user_notifications un
JOIN users u ON u.id = un.user_id
WHERE u.role IN ('admin', 'admin_assistant')
ORDER BY un.created_at DESC
LIMIT 10;

-- 3. Проверяем всех администраторов в системе
SELECT 
    id,
    full_name,
    email,
    role,
    is_active
FROM users 
WHERE role IN ('admin', 'admin_assistant')
ORDER BY full_name;

-- 4. Проверяем последние созданные работники
SELECT 
    e.id,
    e.full_name,
    e.created_at,
    s.name as section_name,
    pt.name as profession_name
FROM employees e
JOIN sections s ON s.id = e.section_id
JOIN profession_templates pt ON pt.id = e.profession_template_id
ORDER BY e.created_at DESC
LIMIT 5;

-- 5. Проверяем экзамены последнего созданного работника
SELECT 
    ee.id,
    ee.exam_date,
    ee.next_exam_date,
    ee.pending_date,
    ee.pending_until,
    ee.updated_at,
    ex.name as exam_name,
    e.full_name as employee_name
FROM employee_exams ee
JOIN exams ex ON ex.id = ee.exam_id
JOIN employees e ON e.id = ee.employee_id
WHERE e.created_at > NOW() - INTERVAL '1 hour'
ORDER BY ee.updated_at DESC;