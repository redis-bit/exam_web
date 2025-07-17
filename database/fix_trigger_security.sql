-- Исправление триггера для работы с RLS
-- Выполнить ПОСЛЕ fix_rls_employee_exams.sql

-- 1. Пересоздаем функцию триггера с правами SECURITY DEFINER
CREATE OR REPLACE FUNCTION create_employee_exams_for_profession()
RETURNS TRIGGER 
SECURITY DEFINER -- Важно: выполняется с правами владельца функции
SET search_path = public
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
$$ LANGUAGE plpgsql;

-- 2. Пересоздаем триггер
DROP TRIGGER IF EXISTS trigger_create_employee_exams ON public.employees;
CREATE TRIGGER trigger_create_employee_exams
    AFTER INSERT ON public.employees
    FOR EACH ROW
    WHEN (NEW.profession_template_id IS NOT NULL)
    EXECUTE FUNCTION create_employee_exams_for_profession();

-- 3. Также исправляем функцию обновления next_exam_date
CREATE OR REPLACE FUNCTION update_next_exam_date()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Рассчитываем следующую дату экзамена
    NEW.next_exam_date := calculate_next_exam_date(
        NEW.exam_date,
        NEW.exam_id,
        (SELECT profession_template_id FROM public.employees WHERE id = NEW.employee_id)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Пересоздаем триггер для next_exam_date
DROP TRIGGER IF EXISTS trigger_update_next_exam_date ON public.employee_exams;
CREATE TRIGGER trigger_update_next_exam_date
    BEFORE INSERT OR UPDATE OF exam_date ON public.employee_exams
    FOR EACH ROW
    EXECUTE FUNCTION update_next_exam_date();

-- 5. Тестируем создание работника (замените на реальные ID)
-- Сначала найдем доступные profession_template_id и section_id
SELECT 
    pt.id as profession_id,
    pt.name as profession_name,
    s.id as section_id,
    s.name as section_name
FROM public.profession_templates pt
JOIN public.sections s ON s.id = pt.section_id
WHERE pt.is_active = true
AND s.is_active = true
LIMIT 3;

-- Раскомментируйте и замените ID для тестирования:
/*
INSERT INTO public.employees (
    full_name,
    profession_template_id,
    section_id,
    is_active
) VALUES (
    'Тестовый работник для проверки RLS',
    'ЗАМЕНИТЕ_НА_РЕАЛЬНЫЙ_PROFESSION_ID',
    'ЗАМЕНИТЕ_НА_РЕАЛЬНЫЙ_SECTION_ID',
    true
);
*/