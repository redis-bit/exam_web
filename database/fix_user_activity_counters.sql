-- Исправленный скрипт для добавления счетчиков активности пользователей
-- Проверяет существование колонок перед добавлением

-- Проверяем и добавляем колонки для счетчиков активности в таблицу users
DO $$ 
BEGIN
    -- Добавляем employees_created если не существует
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'employees_created') THEN
        ALTER TABLE users ADD COLUMN employees_created INTEGER DEFAULT 0;
        RAISE NOTICE 'Добавлена колонка employees_created';
    ELSE
        RAISE NOTICE 'Колонка employees_created уже существует';
    END IF;
    
    -- Добавляем exam_dates_approved если не существует
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'exam_dates_approved') THEN
        ALTER TABLE users ADD COLUMN exam_dates_approved INTEGER DEFAULT 0;
        RAISE NOTICE 'Добавлена колонка exam_dates_approved';
    ELSE
        RAISE NOTICE 'Колонка exam_dates_approved уже существует';
    END IF;
    
    -- Добавляем requests_rejected если не существует
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'requests_rejected') THEN
        ALTER TABLE users ADD COLUMN requests_rejected INTEGER DEFAULT 0;
        RAISE NOTICE 'Добавлена колонка requests_rejected';
    ELSE
        RAISE NOTICE 'Колонка requests_rejected уже существует';
    END IF;
END $$;

-- Создаем или заменяем функции для обновления счетчиков
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем функцию для обновления счетчика подтвержденных дат экзаменов
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем функцию для обновления счетчика отклоненных запросов
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем или заменяем триггерную функцию для автоматического увеличения счетчика при создании работника
CREATE OR REPLACE FUNCTION trigger_increment_employees_created()
RETURNS TRIGGER AS $$
DECLARE
    creator_id UUID;
BEGIN
    -- Получаем ID текущего пользователя
    SELECT auth.uid() INTO creator_id;
    
    IF creator_id IS NOT NULL THEN
        PERFORM increment_user_employees_created(creator_id);
        RAISE NOTICE 'Увеличен счетчик созданных работников для пользователя %', creator_id;
    ELSE
        RAISE NOTICE 'Не удалось определить ID текущего пользователя';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Удаляем старый триггер если существует и создаем новый
DROP TRIGGER IF EXISTS trigger_employee_created ON employees;
CREATE TRIGGER trigger_employee_created
  AFTER INSERT ON employees
  FOR EACH ROW
  EXECUTE FUNCTION trigger_increment_employees_created();

-- Создаем или заменяем представление для получения пользователей с счетчиками
DROP VIEW IF EXISTS users_with_activity_stats;
CREATE VIEW users_with_activity_stats AS
SELECT 
  u.id,
  u.full_name,
  u.email,
  u.section_id,
  u.role,
  u.created_at,
  u.last_action_at,
  u.last_visit_at,
  u.is_active,
  u.activity_rating,
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

-- Инициализируем счетчики нулевыми значениями для существующих пользователей
UPDATE users 
SET 
  employees_created = COALESCE(employees_created, 0),
  exam_dates_approved = COALESCE(exam_dates_approved, 0),
  requests_rejected = COALESCE(requests_rejected, 0)
WHERE 
  employees_created IS NULL 
  OR exam_dates_approved IS NULL 
  OR requests_rejected IS NULL;

-- Комментарии к колонкам
COMMENT ON COLUMN users.employees_created IS 'Количество созданных пользователем работников';
COMMENT ON COLUMN users.exam_dates_approved IS 'Количество подтвержденных пользователем дат экзаменов';
COMMENT ON COLUMN users.requests_rejected IS 'Количество отклоненных пользователем запросов';

-- Выводим информацию о завершении
DO $$
BEGIN
    RAISE NOTICE 'Скрипт успешно выполнен!';
    RAISE NOTICE 'Добавлены счетчики активности пользователей';
    RAISE NOTICE 'Созданы функции для инкремента счетчиков';
    RAISE NOTICE 'Создан триггер для автоматического подсчета созданных работников';
    RAISE NOTICE 'Создано представление users_with_activity_stats';
END $$;