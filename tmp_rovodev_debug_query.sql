-- Проверим экзамены для активных сотрудников
SELECT 
  e.full_name,
  e.id as employee_id,
  ee.id as exam_record_id,
  ex.name as exam_name,
  ee.exam_date,
  ee.next_exam_date,
  ee.pending_date
FROM employees e
LEFT JOIN employee_exams ee ON e.id = ee.employee_id
LEFT JOIN exams ex ON ee.exam_id = ex.id
WHERE e.is_active = true
ORDER BY e.full_name, ex.name;

-- Проверим конкретно для наших сотрудников
SELECT 
  'Елесин Л.В.' as employee_name,
  COUNT(*) as exam_count
FROM employee_exams ee
WHERE ee.employee_id = 'a4cc354c-5880-4a2e-a7c6-3f35bdcad7a2'

UNION ALL

SELECT 
  'Кирчик П.А.' as employee_name,
  COUNT(*) as exam_count
FROM employee_exams ee
WHERE ee.employee_id = 'b4be582a-8b0b-4d6b-870b-ea48e73141b8';