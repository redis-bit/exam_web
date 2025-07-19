-- Система уведомлений и подтверждений
-- Выполнять в SQL Editor в Supabase Dashboard после основных таблиц

-- 1. Таблица пользовательских уведомлений
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('exam_date_pending', 'exam_date_approved', 'exam_date_rejected', 'employee_created_pending', 'employee_approved', 'employee_rejected')) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- для автоматического удаления старых уведомлений
    related_id UUID, -- ID связанной записи (employee_exam, employee и т.д.)
    action_data JSONB -- дополнительные данные для действий
);

-- 2. Таблица запросов на подтверждение
CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT CHECK (type IN ('exam_date_change', 'employee_create', 'employee_delete')) NOT NULL,
    requested_by UUID REFERENCES users(id) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id),
    review_comment TEXT,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'), -- автоматическое отклонение через 7 дней
    
    -- Данные запроса
    employee_id UUID REFERENCES employees(id),
    exam_id UUID REFERENCES exams(id),
    old_value JSONB, -- старые данные
    new_value JSONB, -- новые данные
    
    -- Индексы для быстрого поиска
    CONSTRAINT unique_pending_exam_change UNIQUE (employee_id, exam_id, type, status) DEFERRABLE INITIALLY DEFERRED
);

-- 3. Функция для создания уведомления
CREATE OR REPLACE FUNCTION create_user_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_related_id UUID DEFAULT NULL,
    p_action_data JSONB DEFAULT NULL,
    p_expires_days INTEGER DEFAULT 30
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO user_notifications (
        user_id, type, title, message, related_id, action_data, expires_at
    ) VALUES (
        p_user_id, p_type, p_title, p_message, p_related_id, p_action_data,
        NOW() + INTERVAL '1 day' * p_expires_days
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Функция для создания запроса на подтверждение создания работника
CREATE OR REPLACE FUNCTION request_employee_creation(
    p_full_name TEXT,
    p_profession_template_id UUID,
    p_section_id UUID,
    p_requested_by UUID
) RETURNS UUID AS $$
DECLARE
    request_id UUID;
    section_name TEXT;
    profession_name TEXT;
    requester_name TEXT;
BEGIN
    -- Получаем имена для уведомлений
    SELECT s.name INTO section_name
    FROM sections s WHERE s.id = p_section_id;
    
    SELECT pt.name INTO profession_name
    FROM profession_templates pt WHERE pt.id = p_profession_template_id;
    
    SELECT u.full_name INTO requester_name
    FROM users u WHERE u.id = p_requested_by;
    
    -- Создаем запрос на подтверждение
    INSERT INTO approval_requests (
        type, requested_by,
        new_value
    ) VALUES (
        'employee_create', p_requested_by,
        jsonb_build_object(
            'full_name', p_full_name,
            'profession_template_id', p_profession_template_id,
            'section_id', p_section_id
        )
    ) RETURNING id INTO request_id;
    
    -- Создаем уведомление для пользователя
    PERFORM create_user_notification(
        p_requested_by,
        'employee_created_pending',
        'Создание работника ожидает подтверждения',
        format('Ваш запрос на создание работника "%s" (%s, %s) отправлен на рассмотрение администратору.', 
               p_full_name, profession_name, section_name),
        request_id
    );
    
    -- Создаем уведомления для всех администраторов
    INSERT INTO user_notifications (user_id, type, title, message, related_id)
    SELECT 
        u.id,
        'employee_created_pending',
        'Новый запрос на создание работника',
        format('Пользователь %s запрашивает создание работника "%s" (%s, %s).',
               requester_name, p_full_name, profession_name, section_name),
        request_id
    FROM users u 
    WHERE u.role IN ('admin', 'admin_assistant') AND u.is_active = true;
    
    RETURN request_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Функция для создания запроса на подтверждение изменения даты экзамена
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
    
    -- Создаем запрос на подтверждение
    INSERT INTO approval_requests (
        type, requested_by, employee_id, exam_id,
        old_value, new_value
    ) VALUES (
        'exam_date_change', p_requested_by, p_employee_id, p_exam_id,
        jsonb_build_object('exam_date', old_exam_date),
        jsonb_build_object('exam_date', p_new_date)
    ) RETURNING id INTO request_id;
    
    -- Обновляем employee_exams с pending данными
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

-- 6. Функция для подтверждения/отклонения запроса
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
        ELSIF request_record.type = 'employee_create' THEN
            -- Создаем работника
            INSERT INTO employees (
                full_name, 
                profession_template_id, 
                section_id
            ) VALUES (
                request_record.new_value->>'full_name',
                (request_record.new_value->>'profession_template_id')::UUID,
                (request_record.new_value->>'section_id')::UUID
            );
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
                format('Ваш запрос на создание работника "%s" был подтвержден администратором %s.%s',
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
$$ LANGUAGE plpgsql;

-- 6. Функция для автоматического отклонения просроченных запросов
CREATE OR REPLACE FUNCTION auto_reject_expired_requests()
RETURNS void AS $$
DECLARE
    expired_request approval_requests%ROWTYPE;
BEGIN
    -- Обрабатываем все просроченные запросы
    FOR expired_request IN 
        SELECT * FROM approval_requests 
        WHERE status = 'pending' AND expires_at < NOW()
    LOOP
        -- Отклоняем запрос
        PERFORM process_approval_request(
            expired_request.id,
            NULL, -- системное отклонение
            'rejected',
            'Запрос автоматически отклонен по истечении срока рассмотрения'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7. Функция для получения количества ожидающих подтверждения запросов
CREATE OR REPLACE FUNCTION get_pending_approvals_count(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    count_result INTEGER;
BEGIN
    IF p_user_id IS NULL THEN
        -- Для администраторов - все ожидающие запросы
        SELECT COUNT(*) INTO count_result
        FROM approval_requests
        WHERE status = 'pending' AND expires_at > NOW();
    ELSE
        -- Для конкретного пользователя - только его запросы
        SELECT COUNT(*) INTO count_result
        FROM approval_requests
        WHERE status = 'pending' AND requested_by = p_user_id AND expires_at > NOW();
    END IF;
    
    RETURN count_result;
END;
$$ LANGUAGE plpgsql;

-- 8. Функция для очистки старых уведомлений
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM user_notifications
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    DELETE FROM approval_requests
    WHERE status != 'pending' AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 9. Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by ON approval_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_approval_requests_expires_at ON approval_requests(expires_at);

-- 11. Функция для создания запроса на создание работника (для хука)
CREATE OR REPLACE FUNCTION request_employee_creation_hook(
    p_full_name TEXT,
    p_profession_template_id UUID,
    p_section_id UUID,
    p_requested_by UUID
) RETURNS UUID AS $$
BEGIN
    RETURN request_employee_creation(p_full_name, p_profession_template_id, p_section_id, p_requested_by);
END;
$$ LANGUAGE plpgsql;

-- 12. Представление для админской панели подтверждений
CREATE OR REPLACE VIEW admin_approval_queue AS
SELECT 
    ar.id,
    ar.type,
    ar.created_at,
    ar.expires_at,
    u.full_name as requester_name,
    u.email as requester_email,
    s.name as section_name,
    e.full_name as employee_name,
    ex.name as exam_name,
    ar.old_value,
    ar.new_value,
    EXTRACT(EPOCH FROM (ar.expires_at - NOW()))/3600 as hours_until_expiry
FROM approval_requests ar
JOIN users u ON u.id = ar.requested_by
LEFT JOIN employees e ON e.id = ar.employee_id
LEFT JOIN sections s ON s.id = (
    CASE 
        WHEN ar.type = 'employee_create' THEN (ar.new_value->>'section_id')::UUID
        ELSE e.section_id
    END
)
LEFT JOIN exams ex ON ex.id = ar.exam_id
WHERE ar.status = 'pending' AND ar.expires_at > NOW()
ORDER BY ar.created_at ASC;