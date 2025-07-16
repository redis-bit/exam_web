-- Создание таблиц для системы учёта экзаменов работников
-- Выполнять в SQL Editor в Supabase Dashboard

-- 1. Таблица участков
CREATE TABLE IF NOT EXISTS sections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE
);

-- 2. Таблица пользователей (расширение auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    section_id UUID REFERENCES sections(id),
    role TEXT CHECK (role IN ('admin', 'admin_assistant', 'section_chief')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_action_at TIMESTAMPTZ,
    last_visit_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    activity_rating INTEGER DEFAULT 0
);

-- 3. Таблица экзаменов
CREATE TABLE IF NOT EXISTS exams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    periodicity INTEGER NOT NULL -- в днях
);

-- 4. Таблица шаблонов профессий
CREATE TABLE IF NOT EXISTS profession_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    section_id UUID REFERENCES sections(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE
);

-- 5. Таблица связи профессий и экзаменов
CREATE TABLE IF NOT EXISTS profession_exams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profession_template_id UUID REFERENCES profession_templates(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    periodicity_override INTEGER, -- переопределение периодичности для конкретной профессии
    UNIQUE(profession_template_id, exam_id)
);

-- 6. Таблица работников
CREATE TABLE IF NOT EXISTS employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    profession_template_id UUID REFERENCES profession_templates(id),
    section_id UUID REFERENCES sections(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- 7. Таблица экзаменов работников
CREATE TABLE IF NOT EXISTS employee_exams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES exams(id),
    exam_date DATE NOT NULL,
    next_exam_date DATE, -- вычисляемое поле
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    pending_date DATE, -- предлагаемая новая дата
    pending_until TIMESTAMPTZ, -- время до автоматического отклонения
    UNIQUE(employee_id, exam_id)
);

-- 8. Таблица новостей
CREATE TABLE IF NOT EXISTS news (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    author_id UUID REFERENCES users(id)
);

-- 9. Таблица резервных копий
CREATE TABLE IF NOT EXISTS backups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    file_size INTEGER,
    file_path TEXT,
    created_by UUID REFERENCES users(id)
);

-- 10. Таблица тем форума
CREATE TABLE IF NOT EXISTS forum_topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- 11. Таблица сообщений форума
CREATE TABLE IF NOT EXISTS forum_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    topic_id UUID REFERENCES forum_topics(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Создание индексов для оптимизации производительности
CREATE INDEX IF NOT EXISTS idx_users_section_id ON users(section_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_employees_section_id ON employees(section_id);
CREATE INDEX IF NOT EXISTS idx_employees_profession_id ON employees(profession_template_id);
CREATE INDEX IF NOT EXISTS idx_employee_exams_employee_id ON employee_exams(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_exams_exam_id ON employee_exams(exam_id);
CREATE INDEX IF NOT EXISTS idx_employee_exams_next_date ON employee_exams(next_exam_date);
CREATE INDEX IF NOT EXISTS idx_forum_messages_topic_id ON forum_messages(topic_id);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Применение триггера к таблицам
CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profession_templates_updated_at BEFORE UPDATE ON profession_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_forum_topics_updated_at BEFORE UPDATE ON forum_topics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_forum_messages_updated_at BEFORE UPDATE ON forum_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();