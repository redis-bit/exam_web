-- Исправление проблемы с дублирующимися pending запросами на изменение дат экзаменов
-- Выполнить в SQL Editor в Supabase Dashboard

-- 1. СНАЧАЛА ИСПРАВЛЯЕМ ОГРАНИЧЕНИЕ УНИКАЛЬНОСТИ
-- Удаляем старое ограничение, которое блокирует и pending, и rejected статусы
ALTER TABLE approval_requests 
DROP CONSTRAINT IF EXISTS unique_pending_exam_change;

-- Создаем новое ограничение только для pending запросов
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_exam_change 
ON approval_requests (employee_id, exam_id, type) 
WHERE status = 'pending' AND type = 'exam_date_change';

-- 2. Теперь обновляем функцию request_exam_date_change
CREATE OR REPLACE FUNCTION request_exam_date_change(
    p_employee_id UUID,
    p_exam_id UUID,
    p_new_date DATE,
    p_requested_by UUID
) RETURNS UUID AS $$
DECLARE
    request_id UUID;
    old_exam_date DATE;
    employee_name TEXT;
    exam_name TEXT;
    requester_name TEXT;
BEGIN
    -- Получаем текущую дату экзамена
    SELECT exam_date INTO old_exam_date
    FROM employee_exams
    WHERE employee_id = p_employee_id AND exam_id = p_exam_id;
    
    -- Получаем имена для уведомлений
    SELECT e.full_name INTO employee_name
    FROM employees e WHERE e.id = p_employee_id;
    
    SELECT ex.name INTO exam_name
    FROM exams ex WHERE ex.id = p_exam_id;
    
    SELECT u.full_name INTO requester_name
    FROM users u WHERE u.id = p_requested_by;
    
    -- ИСПРАВЛЕНИЕ: Сначала отклоняем все существующие pending запросы для этого экзамена
    UPDATE approval_requests 
    SET 
        status = 'rejected',
        reviewed_at = NOW(),
        review_comment = 'Автоматически отклонен из-за нового запроса'
    WHERE employee_id = p_employee_id 
      AND exam_id = p_exam_id 
      AND type = 'exam_date_change' 
      AND status = 'pending';
    
    -- Очищаем pending данные в employee_exams
    UPDATE employee_exams 
    SET 
        pending_date = NULL,
        pending_until = NULL
    WHERE employee_id = p_employee_id AND exam_id = p_exam_id;
    
    -- Создаем новый запрос на подтверждение
    INSERT INTO approval_requests (
        type, requested_by, employee_id, exam_id,
        old_value, new_value
    ) VALUES (
        'exam_date_change', p_requested_by, p_employee_id, p_exam_id,
        jsonb_build_object('exam_date', old_exam_date),
        jsonb_build_object('exam_date', p_new_date)
    ) RETURNING id INTO request_id;
    
    -- Обновляем employee_exams с новыми pending данными
    UPDATE employee_exams 
    SET 
        pending_date = p_new_date,
        pending_until = NOW() + INTERVAL '7 days',
        updated_by = p_requested_by,
        updated_at = NOW()
    WHERE employee_id = p_employee_id AND exam_id = p_exam_id;
    
    -- Создаем уведомление для пользователя
    PERFORM create_user_notification(
        p_requested_by,
        'exam_date_pending',
        'Изменение даты ожидает подтверждения',
        format('Ваш запрос на изменение даты экзамена "%s" для работника %s отправлен на рассмотрение администратору.', 
               exam_name, employee_name),
        request_id
    );
    
    -- Создаем уведомления для всех администраторов
    INSERT INTO user_notifications (user_id, type, title, message, related_id)
    SELECT 
        u.id,
        'exam_date_pending',
        'Новый запрос на изменение даты экзамена',
        format('Пользователь %s запрашивает изменение даты экзамена "%s" для работника %s с %s на %s.',
               requester_name, exam_name, employee_name, 
               to_char(old_exam_date, 'DD.MM.YYYY'),
               to_char(p_new_date, 'DD.MM.YYYY')),
        request_id
    FROM users u 
    WHERE u.role IN ('admin', 'admin_assistant') AND u.is_active = true;
    
    RETURN request_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Очистка существующих "зависших" pending запросов
UPDATE approval_requests 
SET 
    status = 'rejected',
    reviewed_at = NOW(),
    review_comment = 'Автоматически отклонен при исправлении системы'
WHERE type = 'exam_date_change' 
  AND status = 'pending' 
  AND expires_at < NOW();

-- 3. Очистка pending данных в employee_exams для просроченных запросов
UPDATE employee_exams 
SET 
    pending_date = NULL,
    pending_until = NULL
WHERE pending_until IS NOT NULL 
  AND pending_until < NOW();

-- 4. Проверяем результат
SELECT 
    'Активные pending запросы:' as info,
    COUNT(*) as count
FROM approval_requests 
WHERE status = 'pending' AND type = 'exam_date_change'

UNION ALL

SELECT 
    'Экзамены с pending_date:' as info,
    COUNT(*) as count
FROM employee_exams 
WHERE pending_date IS NOT NULL;