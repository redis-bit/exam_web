-- Функции и триггеры для системы учёта экзаменов
-- Выполнять в SQL Editor в Supabase Dashboard после создания таблиц

-- Функция для расчета следующей даты экзамена
CREATE OR REPLACE FUNCTION calculate_next_exam_date(
    exam_date DATE,
    exam_id UUID,
    profession_template_id UUID
) RETURNS DATE AS $$
DECLARE
    periodicity_days INTEGER;
BEGIN
    -- Получаем периодичность (сначала проверяем переопределение, потом базовую)
    SELECT COALESCE(pe.periodicity_override, e.periodicity)
    INTO periodicity_days
    FROM exams e
    LEFT JOIN profession_exams pe ON pe.exam_id = e.id AND pe.profession_template_id = $3
    WHERE e.id = $2;
    
    -- Если периодичность не найдена, возвращаем NULL
    IF periodicity_days IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Возвращаем дату + периодичность
    RETURN exam_date + INTERVAL '1 day' * periodicity_days;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического расчета next_exam_date
CREATE OR REPLACE FUNCTION update_next_exam_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Получаем profession_template_id из таблицы employees
    SELECT pt.id INTO NEW.next_exam_date
    FROM employees e
    WHERE e.id = NEW.employee_id;
    
    -- Рассчитываем следующую дату экзамена
    NEW.next_exam_date := calculate_next_exam_date(
        NEW.exam_date,
        NEW.exam_id,
        (SELECT profession_template_id FROM employees WHERE id = NEW.employee_id)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Применяем триггер к таблице employee_exams
CREATE TRIGGER trigger_update_next_exam_date
    BEFORE INSERT OR UPDATE OF exam_date ON employee_exams
    FOR EACH ROW
    EXECUTE FUNCTION update_next_exam_date();

-- Функция для автоматического отклонения неподтвержденных изменений
CREATE OR REPLACE FUNCTION auto_reject_pending_changes()
RETURNS void AS $$
BEGIN
    UPDATE employee_exams 
    SET pending_date = NULL, pending_until = NULL
    WHERE pending_until IS NOT NULL 
    AND pending_until < NOW();
END;
$$ LANGUAGE plpgsql;

-- Функция для обновления активности пользователя
CREATE OR REPLACE FUNCTION update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users 
    SET last_action_at = NOW(),
        activity_rating = activity_rating + 1
    WHERE id = NEW.updated_by;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для отслеживания активности при изменении экзаменов
CREATE TRIGGER trigger_user_activity_employee_exams
    AFTER INSERT OR UPDATE ON employee_exams
    FOR EACH ROW
    WHEN (NEW.updated_by IS NOT NULL)
    EXECUTE FUNCTION update_user_activity();

-- Функция для получения статистики по участку
CREATE OR REPLACE FUNCTION get_section_statistics(section_uuid UUID)
RETURNS TABLE(
    total_employees INTEGER,
    overdue_exams INTEGER,
    upcoming_exams INTEGER,
    pending_changes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM employees WHERE section_id = section_uuid AND is_active = true),
        (SELECT COUNT(*)::INTEGER 
         FROM employee_exams ee 
         JOIN employees e ON e.id = ee.employee_id 
         WHERE e.section_id = section_uuid 
         AND ee.next_exam_date < CURRENT_DATE),
        (SELECT COUNT(*)::INTEGER 
         FROM employee_exams ee 
         JOIN employees e ON e.id = ee.employee_id 
         WHERE e.section_id = section_uuid 
         AND ee.next_exam_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'),
        (SELECT COUNT(*)::INTEGER 
         FROM employee_exams ee 
         JOIN employees e ON e.id = ee.employee_id 
         WHERE e.section_id = section_uuid 
         AND ee.pending_date IS NOT NULL);
END;
$$ LANGUAGE plpgsql;

-- Представление для отображения статуса экзаменов с цветовой индикацией
CREATE OR REPLACE VIEW exam_status_view AS
SELECT 
    ee.id,
    e.full_name as employee_name,
    ex.name as exam_name,
    ee.exam_date,
    ee.next_exam_date,
    ee.pending_date,
    s.name as section_name,
    pt.name as profession_name,
    CASE 
        WHEN ee.next_exam_date < CURRENT_DATE THEN 'overdue'
        WHEN ee.next_exam_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'upcoming'
        WHEN ee.pending_date IS NOT NULL THEN 'pending'
        ELSE 'normal'
    END as status,
    CASE 
        WHEN ee.next_exam_date < CURRENT_DATE THEN 'red'
        WHEN ee.next_exam_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'yellow'
        WHEN ee.pending_date IS NOT NULL THEN 'blue'
        ELSE 'green'
    END as color_indicator
FROM employee_exams ee
JOIN employees e ON e.id = ee.employee_id
JOIN exams ex ON ex.id = ee.exam_id
JOIN sections s ON s.id = e.section_id
JOIN profession_templates pt ON pt.id = e.profession_template_id
WHERE e.is_active = true;

-- Функция для создания экзаменов работника при назначении профессии
CREATE OR REPLACE FUNCTION create_employee_exams_for_profession()
RETURNS TRIGGER AS $$
BEGIN
    -- Создаем записи экзаменов для нового работника на основе его профессии
    INSERT INTO employee_exams (employee_id, exam_id, exam_date, updated_by)
    SELECT 
        NEW.id,
        pe.exam_id,
        CURRENT_DATE - INTERVAL '1 year', -- Устанавливаем дату год назад, чтобы экзамен был просрочен
        NULL -- updated_by будет установлен позже администратором
    FROM profession_exams pe
    WHERE pe.profession_template_id = NEW.profession_template_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического создания экзаменов при добавлении работника
CREATE TRIGGER trigger_create_employee_exams
    AFTER INSERT ON employees
    FOR EACH ROW
    WHEN (NEW.profession_template_id IS NOT NULL)
    EXECUTE FUNCTION create_employee_exams_for_profession();