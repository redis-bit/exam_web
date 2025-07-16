-- Исправление функции update_next_exam_date
-- Выполните этот скрипт для исправления ошибки

-- Исправленная функция для автоматического расчета next_exam_date
CREATE OR REPLACE FUNCTION update_next_exam_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Рассчитываем следующую дату экзамена
    NEW.next_exam_date := calculate_next_exam_date(
        NEW.exam_date,
        NEW.exam_id,
        (SELECT profession_template_id FROM employees WHERE id = NEW.employee_id)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;