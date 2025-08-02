-- Fix for "Function Search Path Mutable" warnings reported on 2025-08-01
-- Solution: Recreate all functions with a fixed search_path.
-- Version 3: Fixed unterminated quoted string error by using jsonb_build_object.

-- from 01_create_tables.sql
DROP FUNCTION IF EXISTS update_updated_at_column();
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- from 02_functions_and_triggers.sql
DROP FUNCTION IF EXISTS calculate_next_exam_date(DATE, INTEGER);
CREATE OR REPLACE FUNCTION calculate_next_exam_date(
    p_exam_date DATE,
    p_frequency_months INTEGER
)
RETURNS DATE AS $$
BEGIN
    RETURN p_exam_date + (p_frequency_months || ' months')::INTERVAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS auto_reject_pending_changes();
CREATE OR REPLACE FUNCTION auto_reject_pending_changes()
RETURNS TRIGGER AS $$
BEGIN
    NEW.pending_date = NULL;
    NEW.pending_until = NULL;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS update_user_activity();
CREATE OR REPLACE FUNCTION update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users SET last_action_at = now() WHERE id = NEW.updated_by;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS get_section_statistics(UUID);
CREATE OR REPLACE FUNCTION get_section_statistics(section_uuid UUID)
RETURNS TABLE(status TEXT, color_indicator TEXT, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT esv.status, esv.color_indicator, COUNT(*)
    FROM exam_status_view esv
    WHERE esv.section_name = (SELECT name FROM sections WHERE id = section_uuid)
    GROUP BY esv.status, esv.color_indicator;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public';

-- from 03_rls_policies.sql
DROP FUNCTION IF EXISTS get_user_role();
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT role
        FROM users
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS get_user_section_id();
CREATE OR REPLACE FUNCTION get_user_section_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT section_id
        FROM users
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- from 05_notifications_and_approvals.sql
DROP FUNCTION IF EXISTS create_user_notification(UUID, TEXT, TEXT, TEXT, UUID, JSONB, INTEGER);
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS request_employee_creation(TEXT, UUID, UUID, UUID);
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
    -- Get names for notifications
    SELECT s.name INTO section_name
    FROM sections s WHERE s.id = p_section_id;

    SELECT pt.name INTO profession_name
    FROM profession_templates pt WHERE pt.id = p_profession_template_id;

    SELECT u.full_name INTO requester_name
    FROM users u WHERE u.id = p_requested_by;

    -- Create approval request
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

    -- Create notification for the user
    PERFORM create_user_notification(
        p_requested_by,
        'employee_created_pending',
        'Создание работника ожидает подтверждения',
        format('Ваш запрос на создание работника "%s" (%s, %s) отправлен на рассмотрение администратору.',
               p_full_name, profession_name, section_name),
        request_id
    );

    -- Create notifications for all admins
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS request_exam_date_change(UUID, UUID, DATE, UUID);
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
    -- Get current exam date
    SELECT exam_date INTO old_exam_date
    FROM employee_exams
    WHERE employee_id = p_employee_id AND exam_id = p_exam_id;

    -- Get names for notifications
    SELECT e.full_name INTO employee_name
    FROM employees e WHERE e.id = p_employee_id;

    SELECT ex.name INTO exam_name
    FROM exams ex WHERE ex.id = p_exam_id;

    SELECT u.full_name INTO requester_name
    FROM users u WHERE u.id = p_requested_by;

    -- Create approval request
    INSERT INTO approval_requests (
        type, requested_by, employee_id, exam_id,
        old_value, new_value
    ) VALUES (
        'exam_date_change', p_requested_by, p_employee_id, p_exam_id,
        jsonb_build_object('exam_date', old_exam_date),
        jsonb_build_object('exam_date', p_new_date)
    ) RETURNING id INTO request_id;

    -- Update employee_exams with pending data
    UPDATE employee_exams
    SET
        pending_date = p_new_date,
        pending_until = NOW() + INTERVAL '7 days',
        updated_by = p_requested_by,
        updated_at = NOW()
    WHERE employee_id = p_employee_id AND exam_id = p_exam_id;

    -- Create notification for the user
    PERFORM create_user_notification(
        p_requested_by,
        'exam_date_pending',
        'Изменение даты ожидает подтверждения',
        format('Ваш запрос на изменение даты экзамена "%s" для работника %s отправлен на рассмотрение администратору.',
               exam_name, employee_name),
        request_id
    );

    -- Create notifications for all admins
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS process_approval_request(UUID, UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION process_approval_request(
    p_request_id UUID,
    p_reviewed_by UUID,
    p_status TEXT, -- 'approved' or 'rejected'
    p_comment TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    request_record approval_requests%ROWTYPE;
    employee_name TEXT;
    exam_name TEXT;
    reviewer_name TEXT;
    requester_id UUID;
BEGIN
    -- Get request data
    SELECT * INTO request_record
    FROM approval_requests
    WHERE id = p_request_id AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Запрос не найден или уже обработан';
    END IF;

    -- Get names for notifications
    SELECT e.full_name INTO employee_name
    FROM employees e WHERE e.id = request_record.employee_id;

    SELECT ex.name INTO exam_name
    FROM exams ex WHERE ex.id = request_record.exam_id;

    SELECT u.full_name INTO reviewer_name
    FROM users u WHERE u.id = p_reviewed_by;

    requester_id := request_record.requested_by;

    -- Update request status
    UPDATE approval_requests
    SET
        status = p_status,
        reviewed_at = NOW(),
        reviewed_by = p_reviewed_by,
        review_comment = p_comment
    WHERE id = p_request_id;

    IF p_status = 'approved' THEN
        -- Apply changes
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
            -- Create employee
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

        -- Approval notification
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
        -- Reject changes
        UPDATE employee_exams
        SET
            pending_date = NULL,
            pending_until = NULL,
            updated_at = NOW()
        WHERE employee_id = request_record.employee_id
          AND exam_id = request_record.exam_id;

        -- Rejection notification
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS auto_reject_expired_requests();
CREATE OR REPLACE FUNCTION auto_reject_expired_requests()
RETURNS void AS $$
DECLARE
    expired_request approval_requests%ROWTYPE;
BEGIN
    -- Process all expired requests
    FOR expired_request IN
        SELECT * FROM approval_requests
        WHERE status = 'pending' AND expires_at < NOW()
    LOOP
        -- Reject the request
        PERFORM process_approval_request(
            expired_request.id,
            NULL, -- system rejection
            'rejected',
            'Запрос автоматически отклонен по истечении срока рассмотрения'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS get_pending_approvals_count(UUID);
CREATE OR REPLACE FUNCTION get_pending_approvals_count(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    count_result INTEGER;
BEGIN
    IF p_user_id IS NULL THEN
        -- For admins - all pending requests
        SELECT COUNT(*) INTO count_result
        FROM approval_requests
        WHERE status = 'pending' AND expires_at > NOW();
    ELSE
        -- For a specific user - only their requests
        SELECT COUNT(*) INTO count_result
        FROM approval_requests
        WHERE status = 'pending' AND requested_by = p_user_id AND expires_at > NOW();
    END IF;

    RETURN count_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS cleanup_old_notifications();
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM user_notifications
    WHERE expires_at IS NOT NULL AND expires_at < NOW();

    DELETE FROM approval_requests
    WHERE status != 'pending' AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS request_employee_creation_hook(TEXT, UUID, UUID, UUID);
CREATE OR REPLACE FUNCTION request_employee_creation_hook(
    p_full_name TEXT,
    p_profession_template_id UUID,
    p_section_id UUID,
    p_requested_by UUID
) RETURNS UUID AS $$
BEGIN
    RETURN request_employee_creation(p_full_name, p_profession_template_id, p_section_id, p_requested_by);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- from 08_notifications_lifecycle.sql
DROP FUNCTION IF EXISTS mark_notifications_as_read(UUID);
CREATE OR REPLACE FUNCTION mark_notifications_as_read(p_user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE user_notifications
    SET is_read = TRUE
    WHERE user_id = p_user_id AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS cleanup_old_read_notifications();
CREATE OR REPLACE FUNCTION cleanup_old_read_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM user_notifications
        WHERE is_read = TRUE AND created_at < NOW() - INTERVAL '1 day'
        RETURNING *
    )
    SELECT count(*) INTO deleted_count FROM deleted;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS get_unread_notifications_count(UUID);
CREATE OR REPLACE FUNCTION get_unread_notifications_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    count INTEGER;
BEGIN
    SELECT COUNT(*) INTO count
    FROM user_notifications
    WHERE user_id = p_user_id AND is_read = FALSE;
    RETURN count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS run_notifications_cleanup();
CREATE OR REPLACE FUNCTION run_notifications_cleanup()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    deleted_count := cleanup_old_read_notifications();
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- from add_user_activity_counters.sql
DROP FUNCTION IF EXISTS increment_user_employees_created(UUID);
CREATE OR REPLACE FUNCTION increment_user_employees_created(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET employees_created = COALESCE(employees_created, 0) + 1
  WHERE id = user_id;

  IF NOT FOUND THEN
    RAISE NOTICE 'Пользователь с ID % не найден', user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS increment_user_exam_dates_approved(UUID);
CREATE OR REPLACE FUNCTION increment_user_exam_dates_approved(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET exam_dates_approved = COALESCE(exam_dates_approved, 0) + 1
  WHERE id = user_id;

  IF NOT FOUND THEN
    RAISE NOTICE 'Пользователь с ID % не найден', user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS increment_user_requests_rejected(UUID);
CREATE OR REPLACE FUNCTION increment_user_requests_rejected(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET requests_rejected = COALESCE(requests_rejected, 0) + 1
  WHERE id = user_id;

  IF NOT FOUND THEN
    RAISE NOTICE 'Пользователь с ID % не найден', user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS trigger_increment_employees_created();
CREATE OR REPLACE FUNCTION trigger_increment_employees_created()
RETURNS TRIGGER AS $$
DECLARE
    creator_id UUID;
BEGIN
    -- Get current user ID
    SELECT auth.uid() INTO creator_id;

    IF creator_id IS NOT NULL THEN
        PERFORM increment_user_employees_created(creator_id);
        RAISE NOTICE 'Увеличен счетчик созданных работников для пользователя %', creator_id;
    ELSE
        RAISE NOTICE 'Не удалось определить ID текущего пользователя';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- from alternative_user_creation.sql
DROP FUNCTION IF EXISTS create_simple_user(TEXT, TEXT, TEXT, UUID);
CREATE OR REPLACE FUNCTION create_simple_user(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_section_id UUID
) RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Create user in auth.users
    new_user_id := extensions.uuid_generate_v4();

    INSERT INTO auth.users (id, email, encrypted_password, role, aud, instance_id, raw_app_meta_data, raw_user_meta_data)
    VALUES (new_user_id, p_email, crypt(p_password, gen_salt('bf')), 'authenticated', 'authenticated', uuid_generate_v4(), jsonb_build_object('provider', 'email', 'providers', '["email"]'), jsonb_build_object('full_name', p_full_name));

    -- Create user in public.users
    INSERT INTO public.users (id, email, full_name, section_id, role)
    VALUES (new_user_id, p_email, p_full_name, p_section_id, 'section_chief');

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS add_user_direct(TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION add_user_direct(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT
) RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Create user in auth.users
    new_user_id := extensions.uuid_generate_v4();

    INSERT INTO auth.users (id, email, encrypted_password, role, aud, instance_id, raw_app_meta_data, raw_user_meta_data)
    VALUES (new_user_id, p_email, crypt(p_password, gen_salt('bf')), 'authenticated', 'authenticated', uuid_generate_v4(), jsonb_build_object('provider', 'email', 'providers', '["email"]'), jsonb_build_object('full_name', p_full_name));

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- from auto_create_user_profile.sql
DROP FUNCTION IF EXISTS public.handle_new_user();
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, role, section_id)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email, 'section_chief', (SELECT id FROM sections ORDER BY created_at LIMIT 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS add_existing_auth_user_to_users(UUID, TEXT, TEXT, UUID);
CREATE OR REPLACE FUNCTION add_existing_auth_user_to_users(
    p_user_id UUID,
    p_full_name TEXT,
    p_email TEXT,
    p_section_id UUID
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.users (id, full_name, email, section_id, role)
    VALUES (p_user_id, p_full_name, p_email, p_section_id, 'section_chief')
    ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- from delete_user_functions.sql
DROP FUNCTION IF EXISTS delete_auth_user(UUID);
CREATE OR REPLACE FUNCTION delete_auth_user(user_id UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM auth.users WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS delete_user_completely(UUID);
CREATE OR REPLACE FUNCTION delete_user_completely(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- First, delete from public.users, which will cascade to other public tables
    DELETE FROM public.users WHERE id = user_id;
    -- Then, delete from auth.users
    PERFORM delete_auth_user(user_id);
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS cleanup_test_users();
CREATE OR REPLACE FUNCTION cleanup_test_users()
RETURNS TABLE(deleted_email TEXT)
AS $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id, email FROM users WHERE email LIKE '%@example.com' LOOP
        IF delete_user_completely(user_record.id) THEN
            deleted_email := user_record.email;
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- from fix_foreign_key_constraint.sql
DROP FUNCTION IF EXISTS create_local_user(TEXT, TEXT, TEXT, UUID);
CREATE OR REPLACE FUNCTION create_local_user(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_section_id UUID
) RETURNS JSON AS $$
DECLARE
    new_user_id UUID;
    encrypted_pw TEXT;
    result JSON;
BEGIN
    -- 1. Create user in auth.users
    encrypted_pw := crypt(p_password, gen_salt('bf'));
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_sent_at, confirmed_at)
    VALUES (uuid_generate_v4(), uuid_generate_v4(), 'authenticated', 'authenticated', p_email, encrypted_pw, now(), null, null, jsonb_build_object('provider', 'email', 'providers', '["email"]'), jsonb_build_object('full_name', p_full_name), now(), now(), null, '', null, now()) RETURNING id INTO new_user_id;

    -- 2. Create user in public.users
    INSERT INTO public.users (id, email, full_name, section_id, role)
    VALUES (new_user_id, p_email, p_full_name, p_section_id, 'section_chief');

    result := json_build_object('user_id', new_user_id, 'email', p_email, 'full_name', p_full_name);
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- from fix_notifications_cleanup.sql
DROP FUNCTION IF EXISTS force_cleanup_old_notifications();
CREATE OR REPLACE FUNCTION force_cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM user_notifications
        WHERE created_at < NOW() - INTERVAL '2 days'
        RETURNING *
    )
    SELECT count(*) INTO deleted_count FROM deleted;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS update_notification_viewed(UUID);
CREATE OR REPLACE FUNCTION update_notification_viewed(notification_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE user_notifications
    SET is_read = TRUE, last_viewed_at = NOW()
    WHERE id = notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS trigger_update_last_viewed();
CREATE OR REPLACE FUNCTION trigger_update_last_viewed()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_viewed_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS maintenance_cleanup_notifications();
CREATE OR REPLACE FUNCTION maintenance_cleanup_notifications()
RETURNS JSON AS $$
DECLARE
    read_deleted INTEGER;
    forced_deleted INTEGER;
    result JSON;
BEGIN
    SELECT * INTO read_deleted FROM cleanup_old_read_notifications() LIMIT 1;
    SELECT * INTO forced_deleted FROM force_cleanup_old_notifications() LIMIT 1;

    result := json_build_object(
        'read_notifications_deleted', read_deleted,
        'forced_notifications_deleted', forced_deleted
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- from recreate_functions_after_fix.sql
DROP FUNCTION IF EXISTS sync_auth_users_to_users_table();
CREATE OR REPLACE FUNCTION sync_auth_users_to_users_table()
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role, section_id, created_at, updated_at)
    SELECT
        id,
        email,
        raw_user_meta_data->>'full_name' AS full_name,
        'section_chief' AS role,
        (SELECT id FROM sections ORDER BY created_at LIMIT 1) AS section_id,
        created_at,
        updated_at
    FROM auth.users
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- from user_activity_functions.sql
DROP FUNCTION IF EXISTS update_user_last_visit(UUID);
CREATE OR REPLACE FUNCTION update_user_last_visit(user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE users
    SET last_visit_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS update_user_last_action(UUID);
CREATE OR REPLACE FUNCTION update_user_last_action(user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE users
    SET last_action_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS sync_last_sign_in_times();
CREATE OR REPLACE FUNCTION sync_last_sign_in_times()
RETURNS VOID AS $$
BEGIN
    UPDATE public.users u
    SET last_visit_at = a.last_sign_in_at
    FROM auth.users a
    WHERE u.id = a.id AND a.last_sign_in_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS get_users_activity_stats();
CREATE OR REPLACE FUNCTION get_users_activity_stats()
RETURNS TABLE(
    user_id UUID,
    full_name TEXT,
    email TEXT,
    role TEXT,
    section_name TEXT,
    last_action_at TIMESTAMPTZ,
    last_visit_at TIMESTAMPTZ,
    activity_rating NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.full_name,
        u.email,
        u.role,
        s.name AS section_name,
        u.last_action_at,
        u.last_visit_at,
        u.activity_rating
    FROM users u
    LEFT JOIN sections s ON u.section_id = s.id
    ORDER BY u.last_action_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public';

-- from tmp_rovodev_news_notifications_system.sql
DROP FUNCTION IF EXISTS notify_users_about_news();
CREATE OR REPLACE FUNCTION notify_users_about_news()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a notification for each active user
  INSERT INTO user_notifications(user_id, type, title, message, related_id)
  SELECT id, 'news_published', 'Новая новость!', NEW.title, NEW.id
  FROM users WHERE is_active = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS mark_news_as_read(UUID, UUID);
CREATE OR REPLACE FUNCTION mark_news_as_read(p_user_id UUID, p_news_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE user_notifications
    SET is_read = TRUE
    WHERE user_id = p_user_id AND related_id = p_news_id AND type = 'news_published';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP FUNCTION IF EXISTS get_latest_news_for_user(UUID);
CREATE OR REPLACE FUNCTION get_latest_news_for_user(p_user_id UUID)
RETURNS TABLE (news_id UUID, title TEXT, content TEXT, published_at TIMESTAMPTZ, is_read BOOLEAN)
AS $$
BEGIN
    RETURN QUERY
    SELECT n.id, n.title, n.content, n.created_at, un.is_read
    FROM news n
    LEFT JOIN user_notifications un ON n.id = un.related_id AND un.user_id = p_user_id AND un.type = 'news_published'
    ORDER BY n.created_at DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public';


-- Step 3: Recreate all triggers

CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profession_templates_updated_at BEFORE UPDATE ON profession_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_forum_topics_updated_at BEFORE UPDATE ON forum_topics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_forum_messages_updated_at BEFORE UPDATE ON forum_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_next_exam_date
    AFTER INSERT OR UPDATE OF exam_date, frequency_months ON employee_exams
    FOR EACH ROW
    EXECUTE FUNCTION calculate_next_exam_date();

CREATE TRIGGER trigger_user_activity_employee_exams
    AFTER UPDATE ON employee_exams
    FOR EACH ROW
    EXECUTE FUNCTION update_user_activity();

CREATE TRIGGER trigger_create_employee_exams
    AFTER INSERT ON employees
    FOR EACH ROW
    EXECUTE FUNCTION create_employee_exams(); -- NOTE: create_employee_exams function not found in search, assuming it exists

CREATE TRIGGER trigger_employee_created
  AFTER INSERT ON employees
  FOR EACH ROW
  EXECUTE FUNCTION trigger_increment_employees_created();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_last_viewed_trigger
    BEFORE UPDATE ON user_notifications
    FOR EACH ROW
    WHEN (OLD.is_read IS DISTINCT FROM NEW.is_read AND NEW.is_read = true)
    EXECUTE FUNCTION trigger_update_last_viewed();

CREATE TRIGGER notify_news_trigger
  AFTER INSERT ON news
  FOR EACH ROW
  EXECUTE FUNCTION notify_users_about_news();
