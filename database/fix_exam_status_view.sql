-- Исправление представления exam_status_view
-- Выполнить в SQL Editor в Supabase Dashboard

-- 1. Проверяем текущую структуру представления
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'exam_status_view' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Удаляем старое представление
DROP VIEW IF EXISTS public.exam_status_view;

-- 3. Создаем исправленное представление с employee_id
CREATE OR REPLACE VIEW public.exam_status_view AS
SELECT 
    ee.id,
    ee.employee_id,  -- ДОБАВЛЯЕМ employee_id
    ee.exam_id,
    e.full_name as employee_name,
    ex.name as exam_name,
    ee.exam_date,
    ee.next_exam_date,
    ee.pending_date,
    ee.pending_until,
    ee.updated_by,
    ee.updated_at,
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
FROM public.employee_exams ee
JOIN public.employees e ON e.id = ee.employee_id
JOIN public.exams ex ON ex.id = ee.exam_id
JOIN public.sections s ON s.id = e.section_id
JOIN public.profession_templates pt ON pt.id = e.profession_template_id
WHERE e.is_active = true;

-- 4. Даем права на представление
GRANT SELECT ON public.exam_status_view TO authenticated;
GRANT SELECT ON public.exam_status_view TO anon;

-- 5. Проверяем новую структуру
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'exam_status_view' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Тестируем представление
SELECT 
    employee_id,
    employee_name,
    exam_name,
    exam_date,
    next_exam_date,
    status,
    color_indicator
FROM public.exam_status_view
LIMIT 5;