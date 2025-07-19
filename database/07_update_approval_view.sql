-- Обновление представления для админской панели подтверждений
-- Выполнять в SQL Editor в Supabase Dashboard

-- Пересоздаем представление с правильной логикой
DROP VIEW IF EXISTS admin_approval_queue;

CREATE OR REPLACE VIEW admin_approval_queue AS
SELECT 
    ar.id,
    ar.type,
    ar.created_at,
    ar.expires_at,
    u.full_name as requester_name,
    u.email as requester_email,
    COALESCE(
        CASE WHEN ar.type = 'employee_create' THEN s_new.name ELSE s_emp.name END,
        'Неизвестный участок'
    ) as section_name,
    COALESCE(e.full_name, ar.new_value->>'full_name') as employee_name,
    ex.name as exam_name,
    ar.old_value,
    ar.new_value,
    EXTRACT(EPOCH FROM (ar.expires_at - NOW()))/3600 as hours_until_expiry
FROM approval_requests ar
JOIN users u ON u.id = ar.requested_by
LEFT JOIN employees e ON e.id = ar.employee_id
LEFT JOIN sections s_emp ON s_emp.id = e.section_id
LEFT JOIN sections s_new ON s_new.id = (ar.new_value->>'section_id')::UUID
LEFT JOIN exams ex ON ex.id = ar.exam_id
WHERE ar.status = 'pending' AND ar.expires_at > NOW()
ORDER BY ar.created_at ASC;