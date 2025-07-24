# Тестирование интерактивной таблицы

## Проблемы для проверки:

### 1. Даты экзаменов не отображаются
**Возможные причины:**
- Нет данных в таблице `employee_exams`
- Проблемы с запросом к базе данных
- Неправильная группировка экзаменов

**Для проверки выполните в консоли браузера:**
```javascript
// Проверить загруженные данные
console.log('Employees:', employees);
console.log('Table structure:', getTableStructure);
```

### 2. Мобильная версия
**Реализовано:**
- ✅ CSS медиа-запросы для экранов < 768px
- ✅ Переключение с таблицы на карточки
- ✅ Вертикальное отображение данных
- ✅ Адаптивная сетка для экзаменов

## Шаги для тестирования:

### Шаг 1: Проверить данные в базе
```sql
-- Проверить есть ли сотрудники
SELECT COUNT(*) FROM employees WHERE is_active = true;

-- Проверить есть ли экзамены у сотрудников
SELECT e.full_name, COUNT(ee.id) as exam_count 
FROM employees e 
LEFT JOIN employee_exams ee ON e.id = ee.employee_id 
WHERE e.is_active = true 
GROUP BY e.id, e.full_name;

-- Проверить названия экзаменов
SELECT DISTINCT ex.name 
FROM exams ex 
JOIN employee_exams ee ON ex.id = ee.exam_id;
```

### Шаг 2: Проверить в браузере
1. Открыть DevTools (F12)
2. Перейти в "Аналитика" → "Таблицы"
3. Посмотреть в консоль на отладочную информацию
4. Проверить Network tab на запросы к Supabase

### Шаг 3: Тестировать мобильную версию
1. Открыть DevTools
2. Включить Device Toolbar (Ctrl+Shift+M)
3. Выбрать мобильное устройство
4. Проверить переключение на карточки

## Ожидаемый результат:

### Desktop (> 768px):
```
| ФИО        | S+ | P+ |     OT     |     PB     |     GO     |
|------------|----|----|------------|------------|------------|
| Иванов И.И.| S+ | P+ | 01.02.2025 | 15.03.2025 | 20.04.2025 |
|            |    |    |    (3)     |    (2)     |            |
```

### Mobile (< 768px):
```
┌─────────────────────────────────┐
│ Иванов И.И.           [▶ Expand] │
├─────────────────────────────────┤
│ Section: Цех 1 │ Profession: ... │
├─────────────────────────────────┤
│ [OT]        [PB]        [GO]    │
│ 01.02.25    15.03.25    20.04.25│
│ (3 exams)   (2 exams)           │
└─────────────────────────────────┘
```

## Если данные не загружаются:

### Проверить RLS политики:
```sql
-- Проверить политики для employee_exams
SELECT * FROM pg_policies WHERE tablename = 'employee_exams';

-- Временно отключить RLS для тестирования
ALTER TABLE employee_exams DISABLE ROW LEVEL SECURITY;
```

### Добавить тестовые данные:
```sql
-- Добавить тестовые экзамены
INSERT INTO employee_exams (employee_id, exam_id, exam_date, next_exam_date)
SELECT 
  e.id,
  ex.id,
  '2024-01-01'::date,
  '2025-01-01'::date
FROM employees e
CROSS JOIN exams ex
WHERE e.is_active = true
LIMIT 10;
```