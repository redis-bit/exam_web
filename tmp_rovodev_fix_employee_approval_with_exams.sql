-- Исправление функции подтверждения создания работника
-- Добавляет автоматическое создание экзаменов из шаблона профессии

-- 1. Обновляем функцию process_approval_request
CREATE OR REPLACE FUNCTION process_approval_request(
    p_request_id UUID,
    p_reviewed_by UUID,
    p_status TEXT, -- 'approved' или 'rejected'
    p_comment TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    request_record approval_requests%ROWTYPE;
    employee_name TEXT;
    exam_name TEXT;
    reviewer_name TEXT;
    requester_id UUID;
    new_employee_id UUID;
BEGIN
    -- Получаем данные запроса
    SELECT * INTO request_record
    FROM approval_requests
    WHERE id = p_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Запрос не найден или уже обработан';
    END IF;
    
    -- Получаем имена для уведомлений
    SELECT e.full_name INTO employee_name
    FROM employees e WHERE e.id = request_record.employee_id;
    
    SELECT ex.name INTO exam_name
    FROM exams ex WHERE ex.id = request_record.exam_id;
    
    SELECT u.full_name INTO reviewer_name
    FROM users u WHERE u.id = p_reviewed_by;
    
    requester_id := request_record.requested_by;
    
    -- Обновляем статус запроса
    UPDATE approval_requests
    SET 
        status = p_status,
        reviewed_at = NOW(),
        reviewed_by = p_reviewed_by,
        review_comment = p_comment
    WHERE id = p_request_id;
    
    IF p_status = 'approved' THEN
        -- Применяем изменения
        IF request_record.type = 'exam_date_change' THEN
            UPDATE employee_exams
            SET 
                exam_date = (request_record.new_value->>'exam_date')::DATE,
                pending_date = NULL,
                pending_until = NULL,
                updated_by = p_reviewed_by,
                updated_at = NOW()
            WHERE employee_id = request_record.employee_id 
              AND exam_id = request_record.exam_id;
              
            -- Пересчитываем next_exam_date
            UPDATE employee_exams
            SET next_exam_date = calculate_next_exam_date(
                exam_date,
                exam_id,
                (SELECT profession_template_id FROM employees WHERE id = employee_id)
            )
            WHERE employee_id = request_record.employee_id 
              AND exam_id = request_record.exam_id;
              
        ELSIF request_record.type = 'employee_create' THEN
            -- Создаем работника
            INSERT INTO employees (
                full_name, 
                profession_template_id, 
                section_id,
                is_active,
                created_at
            ) VALUES (
                request_record.new_value->>'full_name',
                (request_record.new_value->>'profession_template_id')::UUID,
                (request_record.new_value->>'section_id')::UUID,
                true,
                NOW()
            ) RETURNING id INTO new_employee_id;
            
            -- Создаем экзамены из шаблона профессии с пустыми датами
            INSERT INTO employee_exams (employee_id, exam_id, exam_date, next_exam_date, updated_by, updated_at)
            SELECT 
                new_employee_id,
                pe.exam_id,
                '1900-01-01'::DATE, -- Пустая дата для заполнения
                '1900-01-01'::DATE, -- Пустая дата для заполнения
                p_reviewed_by,
                NOW()
            FROM profession_exams pe
            WHERE pe.profession_template_id = (request_record.new_value->>'profession_template_id')::UUID;
            
            RAISE NOTICE 'Создан работник ID: % с экзаменами из шаблона профессии', new_employee_id;
        END IF;
        
        -- Уведомление о подтверждении
        IF request_record.type = 'exam_date_change' THEN
            PERFORM create_user_notification(
                requester_id,
                'exam_date_approved',
                'Изменение даты подтверждено',
                format('Ваш запрос на изменение даты экзамена "%s" для работника %s был подтвержден администратором %s.%s',
                       exam_name, employee_name, reviewer_name,
                       CASE WHEN p_comment IS NOT NULL THEN format(' Комментарий: %s', p_comment) ELSE '' END),
                p_request_id
            );
        ELSIF request_record.type = 'employee_create' THEN
            PERFORM create_user_notification(
                requester_id,
                'employee_approved',
                'Создание работника подтверждено',
                format('Ваш запрос на создание работника "%s" был подтвержден администратором %s. Работник создан с экзаменами из шаблона профессии.%s',
                       request_record.new_value->>'full_name', reviewer_name,
                       CASE WHEN p_comment IS NOT NULL THEN format(' Комментарий: %s', p_comment) ELSE '' END),
                p_request_id
            );
        END IF;
    ELSE
        -- Отклоняем изменения
        UPDATE employee_exams
        SET 
            pending_date = NULL,
            pending_until = NULL,
            updated_at = NOW()
        WHERE employee_id = request_record.employee_id 
          AND exam_id = request_record.exam_id;
        
        -- Уведомление об отклонении
        IF request_record.type = 'exam_date_change' THEN
            PERFORM create_user_notification(
                requester_id,
                'exam_date_rejected',
                'Изменение даты отклонено',
                format('Ваш запрос на изменение даты экзамена "%s" для работника %s был отклонен администратором %s.%s',
                       exam_name, employee_name, reviewer_name,
                       CASE WHEN p_comment IS NOT NULL THEN format(' Причина: %s', p_comment) ELSE '' END),
                p_request_id
            );
        ELSIF request_record.type = 'employee_create' THEN
            PERFORM create_user_notification(
                requester_id,
                'employee_rejected',
                'Создание работника отклонено',
                format('Ваш запрос на создание работника "%s" был отклонен администратором %s.%s',
                       request_record.new_value->>'full_name', reviewer_name,
                       CASE WHEN p_comment IS NOT NULL THEN format(' Причина: %s', p_comment) ELSE '' END),
                p_request_id
            );
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Обновляем логику создания работника для обычных пользователей
-- Теперь обычные пользователи должны отправлять запрос на подтверждение
CREATE OR REPLACE FUNCTION create_employee_with_approval(
    p_full_name TEXT,
    p_profession_template_id UUID,
    p_section_id UUID,
    p_requested_by UUID
) RETURNS UUID AS $$
DECLARE
    request_id UUID;
    user_role TEXT;
    new_employee_id UUID;
BEGIN
    -- Проверяем роль пользователя
    SELECT role INTO user_role
    FROM users
    WHERE id = p_requested_by;
    
    IF user_role IN ('admin', 'admin_assistant') THEN
        -- Администраторы создают работника сразу
        INSERT INTO employees (
            full_name, 
            profession_template_id, 
            section_id,
            is_active,
            created_at
        ) VALUES (
            p_full_name,
            p_profession_template_id,
            p_section_id,
            true,
            NOW()
        ) RETURNING id INTO new_employee_id;
        
        -- Создаем экзамены из шаблона профессии с пустыми датами
        INSERT INTO employee_exams (employee_id, exam_id, exam_date, next_exam_date, updated_by, updated_at)
        SELECT 
            new_employee_id,
            pe.exam_id,
            '1900-01-01'::DATE, -- Пустая дата для заполнения
            '1900-01-01'::DATE, -- Пустая дата для заполнения
            p_requested_by,
            NOW()
        FROM profession_exams pe
        WHERE pe.profession_template_id = p_profession_template_id;
        
        RETURN new_employee_id;
    ELSE
        -- Обычные пользователи отправляют запрос на подтверждение
        RETURN request_employee_creation(p_full_name, p_profession_template_id, p_section_id, p_requested_by);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Даем права на выполнение функций
GRANT EXECUTE ON FUNCTION create_employee_with_approval(TEXT, UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION process_approval_request(UUID, UUID, TEXT, TEXT) TO authenticated;

-- 4. Проверяем, что функция create_user_notification существует
-- Если её нет, создаем простую версию
CREATE OR REPLACE FUNCTION create_user_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_related_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO user_notifications (
        user_id, type, title, message, related_id, created_at
    ) VALUES (
        p_user_id, p_type, p_title, p_message, p_related_id, NOW()
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION create_user_notification(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;