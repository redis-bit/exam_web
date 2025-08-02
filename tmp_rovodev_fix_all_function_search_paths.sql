-- Comprehensive fix for all function search path security issues
-- This script adds SEARCH_PATH = '' to all functions to fix security warnings

-- 1. Functions from 02_functions_and_triggers.sql
CREATE OR REPLACE FUNCTION calculate_next_exam_date(
    exam_date DATE,
    exam_id UUID,
    profession_template_id UUID
) RETURNS DATE 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    periodicity_days INTEGER;
BEGIN
    -- Получаем периодичность (сначала проверяем переопределение, потом базовую)
    SELECT COALESCE(pe.periodicity_override, e.periodicity)
    INTO periodicity_days
    FROM public.exams e
    LEFT JOIN public.profession_exams pe ON pe.exam_id = e.id AND pe.profession_template_id = $3
    WHERE e.id = $2;
    
    -- Если периодичность не найдена, возвращаем NULL
    IF periodicity_days IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Правильный расчет с учетом високосных лет
    CASE 
        WHEN periodicity_days = 365 THEN
            -- Для годовой периодичности добавляем ровно 1 год
            RETURN exam_date + INTERVAL '1 year';
        WHEN periodicity_days = 1095 THEN
            -- Для 3-летней периодичности добавляем ровно 3 года
            RETURN exam_date + INTERVAL '3 years';
        WHEN periodicity_days = 730 THEN
            -- Для 2-летней периодичности добавляем ровно 2 года
            RETURN exam_date + INTERVAL '2 years';
        WHEN periodicity_days = 180 THEN
            -- Для полугодовой периодичности добавляем 6 месяцев
            RETURN exam_date + INTERVAL '6 months';
        WHEN periodicity_days = 90 THEN
            -- Для квартальной периодичности добавляем 3 месяца
            RETURN exam_date + INTERVAL '3 months';
        WHEN periodicity_days = 30 THEN
            -- Для месячной периодичности добавляем 1 месяц
            RETURN exam_date + INTERVAL '1 month';
        ELSE
            -- Для остальных случаев используем дни (но это может быть неточно)
            RETURN exam_date + INTERVAL '1 day' * periodicity_days;
    END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION update_next_exam_date()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Рассчитываем следующую дату экзамена
    NEW.next_exam_date := public.calculate_next_exam_date(
        NEW.exam_date,
        NEW.exam_id,
        (SELECT profession_template_id FROM public.employees WHERE id = NEW.employee_id)
    );
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION auto_reject_pending_changes()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.employee_exams 
    SET pending_date = NULL, pending_until = NULL
    WHERE pending_until IS NOT NULL 
    AND pending_until < NOW();
END;
$$;

CREATE OR REPLACE FUNCTION update_user_activity()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.users 
    SET last_action_at = NOW(),
        activity_rating = activity_rating + 1
    WHERE id = NEW.updated_by;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION get_section_statistics(section_uuid UUID)
RETURNS TABLE(
    total_employees INTEGER,
    overdue_exams INTEGER,
    upcoming_exams INTEGER,
    pending_changes INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM public.employees WHERE section_id = section_uuid AND is_active = true),
        (SELECT COUNT(*)::INTEGER 
         FROM public.employee_exams ee 
         JOIN public.employees e ON e.id = ee.employee_id 
         WHERE e.section_id = section_uuid 
         AND ee.next_exam_date < CURRENT_DATE),
        (SELECT COUNT(*)::INTEGER 
         FROM public.employee_exams ee 
         JOIN public.employees e ON e.id = ee.employee_id 
         WHERE e.section_id = section_uuid 
         AND ee.next_exam_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'),
        (SELECT COUNT(*)::INTEGER 
         FROM public.employee_exams ee 
         JOIN public.employees e ON e.id = ee.employee_id 
         WHERE e.section_id = section_uuid 
         AND ee.pending_date IS NOT NULL);
END;
$$;

CREATE OR REPLACE FUNCTION create_employee_exams_for_profession()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Создаем записи экзаменов для нового работника на основе его профессии
    INSERT INTO public.employee_exams (employee_id, exam_id, exam_date, updated_by)
    SELECT 
        NEW.id,
        pe.exam_id,
        CURRENT_DATE - INTERVAL '1 year', -- Устанавливаем дату год назад, чтобы экзамен был просрочен
        NULL -- updated_by будет установлен позже администратором
    FROM public.profession_exams pe
    WHERE pe.profession_template_id = NEW.profession_template_id;
    
    RETURN NEW;
END;
$$;

-- 2. User activity functions
CREATE OR REPLACE FUNCTION update_user_last_visit(user_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.users 
    SET last_visit_at = NOW()
    WHERE id = user_id;
    
    -- Возвращаем true если обновление прошло успешно
    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION update_user_last_action(user_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.users 
    SET last_action_at = NOW(),
        activity_rating = activity_rating + 1
    WHERE id = user_id;
    
    -- Возвращаем true если обновление прошло успешно
    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION sync_last_sign_in_times()
RETURNS INTEGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    updated_count INTEGER := 0;
    auth_user RECORD;
BEGIN
    -- Проходим по всем пользователям из auth.users и обновляем last_visit_at
    FOR auth_user IN 
        SELECT au.id, au.last_sign_in_at
        FROM auth.users au
        INNER JOIN public.users pu ON au.id = pu.id
        WHERE au.last_sign_in_at IS NOT NULL
    LOOP
        -- Обновляем время последнего визита, если оно отличается
        UPDATE public.users 
        SET last_visit_at = auth_user.last_sign_in_at
        WHERE id = auth_user.id 
        AND (last_visit_at IS NULL OR last_visit_at != auth_user.last_sign_in_at);
        
        IF FOUND THEN
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    RETURN updated_count;
END;
$$;

CREATE OR REPLACE FUNCTION get_users_activity_stats()
RETURNS TABLE(
    user_id UUID,
    full_name TEXT,
    email TEXT,
    role TEXT,
    section_name TEXT,
    last_visit_at TIMESTAMPTZ,
    last_action_at TIMESTAMPTZ,
    activity_rating INTEGER,
    days_since_last_visit INTEGER,
    days_since_last_action INTEGER,
    is_active BOOLEAN
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.full_name,
        u.email,
        u.role::TEXT,
        COALESCE(s.name, 'Не назначен') as section_name,
        u.last_visit_at,
        u.last_action_at,
        u.activity_rating,
        CASE 
            WHEN u.last_visit_at IS NOT NULL 
            THEN EXTRACT(days FROM NOW() - u.last_visit_at)::INTEGER
            ELSE NULL
        END as days_since_last_visit,
        CASE 
            WHEN u.last_action_at IS NOT NULL 
            THEN EXTRACT(days FROM NOW() - u.last_action_at)::INTEGER
            ELSE NULL
        END as days_since_last_action,
        u.is_active
    FROM public.users u
    LEFT JOIN public.sections s ON s.id = u.section_id
    ORDER BY u.last_visit_at DESC NULLS LAST;
END;
$$;

-- 3. Notification and approval functions
CREATE OR REPLACE FUNCTION create_user_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_related_id UUID DEFAULT NULL,
    p_action_data JSONB DEFAULT NULL,
    p_expires_days INTEGER DEFAULT 30
) RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.user_notifications (
        user_id, type, title, message, related_id, action_data, expires_at
    ) VALUES (
        p_user_id, p_type, p_title, p_message, p_related_id, p_action_data,
        NOW() + INTERVAL '1 day' * p_expires_days
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION request_employee_creation(
    p_full_name TEXT,
    p_profession_template_id UUID,
    p_section_id UUID,
    p_requested_by UUID
) RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    request_id UUID;
    section_name TEXT;
    profession_name TEXT;
    requester_name TEXT;
BEGIN
    -- Получаем имена для уведомлений
    SELECT s.name INTO section_name
    FROM public.sections s WHERE s.id = p_section_id;
    
    SELECT pt.name INTO profession_name
    FROM public.profession_templates pt WHERE pt.id = p_profession_template_id;
    
    SELECT u.full_name INTO requester_name
    FROM public.users u WHERE u.id = p_requested_by;
    
    -- Создаем запрос на подтверждение
    INSERT INTO public.approval_requests (
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
    PERFORM public.create_user_notification(
        p_requested_by,
        'employee_created_pending',
        'Создание работника ожидает подтверждения',
        format('Ваш запрос на создание работника "%s" (%s, %s) отправлен на рассмотрение администратору.', 
               p_full_name, profession_name, section_name),
        request_id
    );
    
    -- Создаем уведомления для всех администраторов
    INSERT INTO public.user_notifications (user_id, type, title, message, related_id)
    SELECT 
        u.id,
        'employee_created_pending',
        'Новый запрос на создание работника',
        format('Пользователь %s запрашивает создание работника "%s" (%s, %s).',
               requester_name, p_full_name, profession_name, section_name),
        request_id
    FROM public.users u 
    WHERE u.role IN ('admin', 'admin_assistant') AND u.is_active = true;
    
    RETURN request_id;
END;
$$;

CREATE OR REPLACE FUNCTION request_exam_date_change(
    p_employee_id UUID,
    p_exam_id UUID,
    p_new_date DATE,
    p_requested_by UUID
) RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    request_id UUID;
    old_exam_date DATE;
    employee_name TEXT;
    exam_name TEXT;
    requester_name TEXT;
BEGIN
    -- Получаем текущую дату экзамена
    SELECT exam_date INTO old_exam_date
    FROM public.employee_exams
    WHERE employee_id = p_employee_id AND exam_id = p_exam_id;
    
    -- Получаем имена для уведомлений
    SELECT e.full_name INTO employee_name
    FROM public.employees e WHERE e.id = p_employee_id;
    
    SELECT ex.name INTO exam_name
    FROM public.exams ex WHERE ex.id = p_exam_id;
    
    SELECT u.full_name INTO requester_name
    FROM public.users u WHERE u.id = p_requested_by;
    
    -- Создаем запрос на подтверждение
    INSERT INTO public.approval_requests (
        type, requested_by, employee_id, exam_id,
        old_value, new_value
    ) VALUES (
        'exam_date_change', p_requested_by, p_employee_id, p_exam_id,
        jsonb_build_object('exam_date', old_exam_date),
        jsonb_build_object('exam_date', p_new_date)
    ) RETURNING id INTO request_id;
    
    -- Обновляем employee_exams с pending данными
    UPDATE public.employee_exams 
    SET 
        pending_date = p_new_date,
        pending_until = NOW() + INTERVAL '7 days',
        updated_by = p_requested_by,
        updated_at = NOW()
    WHERE employee_id = p_employee_id AND exam_id = p_exam_id;
    
    -- Создаем уведомление для пользователя
    PERFORM public.create_user_notification(
        p_requested_by,
        'exam_date_pending',
        'Изменение даты ожидает подтверждения',
        format('Ваш запрос на изменение даты экзамена "%s" для работника %s отправлен на рассмотрение администратору.', 
               exam_name, employee_name),
        request_id
    );
    
    -- Создаем уведомления для всех администраторов
    INSERT INTO public.user_notifications (user_id, type, title, message, related_id)
    SELECT 
        u.id,
        'exam_date_pending',
        'Новый запрос на изменение даты экзамена',
        format('Пользователь %s запрашивает изменение даты экзамена "%s" для работника %s с %s на %s.',
               requester_name, exam_name, employee_name, 
               to_char(old_exam_date, 'DD.MM.YYYY'),
               to_char(p_new_date, 'DD.MM.YYYY')),
        request_id
    FROM public.users u 
    WHERE u.role IN ('admin', 'admin_assistant') AND u.is_active = true;
    
    RETURN request_id;
END;
$$;

CREATE OR REPLACE FUNCTION process_approval_request(
    p_request_id UUID,
    p_reviewed_by UUID,
    p_status TEXT, -- 'approved' или 'rejected'
    p_comment TEXT DEFAULT NULL
) RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    request_record public.approval_requests%ROWTYPE;
    employee_name TEXT;
    exam_name TEXT;
    reviewer_name TEXT;
    requester_id UUID;
BEGIN
    -- Получаем данные запроса
    SELECT * INTO request_record
    FROM public.approval_requests
    WHERE id = p_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Запрос не найден или уже обработан';
    END IF;
    
    -- Получаем имена для уведомлений
    SELECT e.full_name INTO employee_name
    FROM public.employees e WHERE e.id = request_record.employee_id;
    
    SELECT ex.name INTO exam_name
    FROM public.exams ex WHERE ex.id = request_record.exam_id;
    
    SELECT u.full_name INTO reviewer_name
    FROM public.users u WHERE u.id = p_reviewed_by;
    
    requester_id := request_record.requested_by;
    
    -- Обновляем статус запроса
    UPDATE public.approval_requests
    SET 
        status = p_status,
        reviewed_at = NOW(),
        reviewed_by = p_reviewed_by,
        review_comment = p_comment
    WHERE id = p_request_id;
    
    IF p_status = 'approved' THEN
        -- Применяем изменения
        IF request_record.type = 'exam_date_change' THEN
            UPDATE public.employee_exams
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
            INSERT INTO public.employees (
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
            PERFORM public.create_user_notification(
                requester_id,
                'exam_date_approved',
                'Изменение даты подтверждено',
                format('Ваш запрос на изменение даты экзамена "%s" для работника %s был подтвержден администратором %s.%s',
                       exam_name, employee_name, reviewer_name,
                       CASE WHEN p_comment IS NOT NULL THEN format(' Комментарий: %s', p_comment) ELSE '' END),
                p_request_id
            );
        ELSIF request_record.type = 'employee_create' THEN
            PERFORM public.create_user_notification(
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
        UPDATE public.employee_exams
        SET 
            pending_date = NULL,
            pending_until = NULL,
            updated_at = NOW()
        WHERE employee_id = request_record.employee_id 
          AND exam_id = request_record.exam_id;
        
        -- Уведомление об отклонении
        IF request_record.type = 'exam_date_change' THEN
            PERFORM public.create_user_notification(
                requester_id,
                'exam_date_rejected',
                'Изменение даты отклонено',
                format('Ваш запрос на изменение даты экзамена "%s" для работника %s был отклонен администратором %s.%s',
                       exam_name, employee_name, reviewer_name,
                       CASE WHEN p_comment IS NOT NULL THEN format(' Причина: %s', p_comment) ELSE '' END),
                p_request_id
            );
        ELSIF request_record.type = 'employee_create' THEN
            PERFORM public.create_user_notification(
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
$$;

CREATE OR REPLACE FUNCTION auto_reject_expired_requests()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    expired_request public.approval_requests%ROWTYPE;
BEGIN
    -- Обрабатываем все просроченные запросы
    FOR expired_request IN 
        SELECT * FROM public.approval_requests 
        WHERE status = 'pending' AND expires_at < NOW()
    LOOP
        -- Отклоняем запрос
        PERFORM public.process_approval_request(
            expired_request.id,
            NULL, -- системное отклонение
            'rejected',
            'Запрос автоматически отклонен по истечении срока рассмотрения'
        );
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION get_pending_approvals_count(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    count_result INTEGER;
BEGIN
    IF p_user_id IS NULL THEN
        -- Для администраторов - все ожидающие запросы
        SELECT COUNT(*) INTO count_result
        FROM public.approval_requests
        WHERE status = 'pending' AND expires_at > NOW();
    ELSE
        -- Для конкретного пользователя - только его запросы
        SELECT COUNT(*) INTO count_result
        FROM public.approval_requests
        WHERE status = 'pending' AND requested_by = p_user_id AND expires_at > NOW();
    END IF;
    
    RETURN count_result;
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    DELETE FROM public.user_notifications
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    DELETE FROM public.approval_requests
    WHERE status != 'pending' AND created_at < NOW() - INTERVAL '30 days';
END;
$$;

CREATE OR REPLACE FUNCTION request_employee_creation_hook(
    p_full_name TEXT,
    p_profession_template_id UUID,
    p_section_id UUID,
    p_requested_by UUID
) RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN public.request_employee_creation(p_full_name, p_profession_template_id, p_section_id, p_requested_by);
END;
$$;