-- Быстрая диагностика данных для интерактивной таблицы

-- 1. Проверить количество активных сотрудников
SELECT 'Active employees' as check_type, COUNT(*) as count 
FROM employees WHERE is_active = true;

-- 2. Проверить экзамены сотрудников
SELECT 'Employee exams' as check_type, COUNT(*) as count 
FROM employee_exams ee
JOIN employees e ON ee.employee_id = e.id 
WHERE e.is_active = true;

-- 3. Проверить названия экзаменов
SELECT 'Exam names' as check_type, string_agg(DISTINCT ex.name, ', ') as names
FROM exams ex
JOIN employee_exams ee ON ex.id = ee.exam_id
JOIN employees e ON ee.employee_id = e.id
WHERE e.is_active = true;

-- 4. Проверить данные первого сотрудника
SELECT 
  e.full_name,
  e.section_id,
  s.name as section_name,
  pt.name as profession_name,
  COUNT(ee.id) as exam_count
FROM employees e
LEFT JOIN sections s ON e.section_id = s.id
LEFT JOIN profession_templates pt ON e.profession_template_id = pt.id
LEFT JOIN employee_exams ee ON e.id = ee.employee_id
WHERE e.is_active = true
GROUP BY e.id, e.full_name, e.section_id, s.name, pt.name
ORDER BY e.full_name
LIMIT 1;

-- 5. Проверить детали экзаменов первого сотрудника
SELECT 
  e.full_name,
  ex.name as exam_name,
  ee.exam_date,
  ee.next_exam_date,
  ee.pending_date
FROM employees e
JOIN employee_exams ee ON e.id = ee.employee_id
JOIN exams ex ON ee.exam_id = ex.id
WHERE e.is_active = true
ORDER BY e.full_name, ex.name
LIMIT 5;