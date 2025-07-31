-- Добавляем поля для счетчиков активности пользователей

-- Проверяем и добавляем колонки для счетчиков активности в таблицу users
DO $$ 
BEGIN
    -- Добавляем employees_created если не существует
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'employees_created') THEN
        ALTER TABLE users ADD COLUMN employees_created INTEGER DEFAULT 0;
    END IF;
    
    -- Добавляем exam_dates_approved если не существует
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'exam_dates_approved') THEN
        ALTER TABLE users ADD COLUMN exam_dates_approved INTEGER DEFAULT 0;
    END IF;
    
    -- Добавляем requests_rejected если не существует
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'requests_rejected') THEN
        ALTER TABLE users ADD COLUMN requests_rejected INTEGER DEFAULT 0;
    END IF;
END $$;

-- Создаем функцию для обновления счетчика созданных работников
CREATE OR REPLACE FUNCTION increment_user_employees_created(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET employees_created = COALESCE(employees_created, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем функцию для обновления счетчика подтвержденных дат экзаменов
CREATE OR REPLACE FUNCTION increment_user_exam_dates_approved(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET exam_dates_approved = COALESCE(exam_dates_approved, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем функцию для обновления счетчика отклоненных запросов
CREATE OR REPLACE FUNCTION increment_user_requests_rejected(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET requests_rejected = COALESCE(requests_rejected, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем триггер для автоматического увеличения счетчика при создании работника
CREATE OR REPLACE FUNCTION trigger_increment_employees_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Получаем ID пользователя из auth.users по email
  DECLARE
    creator_id UUID;
  BEGIN
    -- Попробуем найти пользователя по текущей сессии
    SELECT auth.uid() INTO creator_id;
    
    IF creator_id IS NOT NULL THEN
      PERFORM increment_user_employees_created(creator_id);
    END IF;
    
    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем триггер на таблицу employees
DROP TRIGGER IF EXISTS trigger_employee_created ON employees;
CREATE TRIGGER trigger_employee_created
  AFTER INSERT ON employees
  FOR EACH ROW
  EXECUTE FUNCTION trigger_increment_employees_created();

-- Создаем представление для получения пользователей с счетчиками
CREATE OR REPLACE VIEW users_with_activity_stats AS
SELECT 
  u.*,
  s.name as section_name,
  COALESCE(u.employees_created, 0) as employees_created,
  COALESCE(u.exam_dates_approved, 0) as exam_dates_approved,
  COALESCE(u.requests_rejected, 0) as requests_rejected
FROM users u
LEFT JOIN sections s ON u.section_id = s.id;

-- Предоставляем права на выполнение функций
GRANT EXECUTE ON FUNCTION increment_user_employees_created(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_user_exam_dates_approved(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_user_requests_rejected(UUID) TO authenticated;

-- Предоставляем права на представление
GRANT SELECT ON users_with_activity_stats TO authenticated;

-- Инициализируем счетчики для существующих пользователей (опционально)
-- Подсчитываем уже созданных работников для каждого пользователя
UPDATE users 
SET employees_created = (
  SELECT COUNT(*)
  FROM employees e
  WHERE e.created_at >= users.created_at
  -- Здесь можно добавить логику связи с создателем, если она есть
);

-- Комментарии к таблице
COMMENT ON COLUMN users.employees_created IS 'Количество созданных пользователем работников';
COMMENT ON COLUMN users.exam_dates_approved IS 'Количество подтвержденных пользователем дат экзаменов';
COMMENT ON COLUMN users.requests_rejected IS 'Количество отклоненных пользователем запросов';