-- Row Level Security политики для системы учёта экзаменов
-- Выполнять в SQL Editor в Supabase Dashboard после создания таблиц

-- Включаем RLS для всех таблиц
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE profession_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE profession_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_messages ENABLE ROW LEVEL SECURITY;

-- Функция для получения роли текущего пользователя
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM users 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения section_id текущего пользователя
CREATE OR REPLACE FUNCTION get_user_section_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT section_id 
        FROM users 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ SECTIONS
-- Администраторы и помощники видят все участки
CREATE POLICY "Admins can view all sections" ON sections
    FOR SELECT USING (
        get_user_role() IN ('admin', 'admin_assistant')
    );

-- Начальники участков видят только свой участок
CREATE POLICY "Section chiefs can view own section" ON sections
    FOR SELECT USING (
        get_user_role() = 'section_chief' AND id = get_user_section_id()
    );

-- Только администраторы могут изменять участки
CREATE POLICY "Only admins can modify sections" ON sections
    FOR ALL USING (get_user_role() = 'admin');

-- ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ USERS
-- Администраторы видят всех пользователей
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (get_user_role() = 'admin');

-- Помощники администраторов видят всех пользователей
CREATE POLICY "Admin assistants can view all users" ON users
    FOR SELECT USING (get_user_role() = 'admin_assistant');

-- Начальники участков видят пользователей своего участка
CREATE POLICY "Section chiefs can view section users" ON users
    FOR SELECT USING (
        get_user_role() = 'section_chief' AND section_id = get_user_section_id()
    );

-- Пользователи видят свою запись
CREATE POLICY "Users can view own record" ON users
    FOR SELECT USING (id = auth.uid());

-- Только администраторы могут изменять пользователей
CREATE POLICY "Only admins can modify users" ON users
    FOR ALL USING (get_user_role() = 'admin');

-- ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ EXAMS
-- Все аутентифицированные пользователи могут читать экзамены
CREATE POLICY "Authenticated users can view exams" ON exams
    FOR SELECT USING (auth.role() = 'authenticated');

-- Только администраторы могут изменять экзамены
CREATE POLICY "Only admins can modify exams" ON exams
    FOR ALL USING (get_user_role() = 'admin');

-- ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ PROFESSION_TEMPLATES
-- Администраторы и помощники видят все профессии
CREATE POLICY "Admins can view all professions" ON profession_templates
    FOR SELECT USING (
        get_user_role() IN ('admin', 'admin_assistant')
    );

-- Начальники участков видят профессии своего участка
CREATE POLICY "Section chiefs can view section professions" ON profession_templates
    FOR SELECT USING (
        get_user_role() = 'section_chief' AND section_id = get_user_section_id()
    );

-- Только администраторы могут изменять профессии
CREATE POLICY "Only admins can modify professions" ON profession_templates
    FOR ALL USING (get_user_role() = 'admin');

-- ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ PROFESSION_EXAMS
-- Все аутентифицированные пользователи могут читать связи профессий и экзаменов
CREATE POLICY "Authenticated users can view profession exams" ON profession_exams
    FOR SELECT USING (auth.role() = 'authenticated');

-- Только администраторы могут изменять связи
CREATE POLICY "Only admins can modify profession exams" ON profession_exams
    FOR ALL USING (get_user_role() = 'admin');

-- ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ EMPLOYEES
-- Администраторы и помощники видят всех работников
CREATE POLICY "Admins can view all employees" ON employees
    FOR SELECT USING (
        get_user_role() IN ('admin', 'admin_assistant')
    );

-- Начальники участков видят работников своего участка
CREATE POLICY "Section chiefs can view section employees" ON employees
    FOR SELECT USING (
        get_user_role() = 'section_chief' AND section_id = get_user_section_id()
    );

-- Администраторы могут изменять всех работников
CREATE POLICY "Admins can modify all employees" ON employees
    FOR ALL USING (get_user_role() = 'admin');

-- Начальники участков могут изменять работников своего участка
CREATE POLICY "Section chiefs can modify section employees" ON employees
    FOR ALL USING (
        get_user_role() = 'section_chief' AND section_id = get_user_section_id()
    );

-- ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ EMPLOYEE_EXAMS
-- Администраторы и помощники видят все экзамены работников
CREATE POLICY "Admins can view all employee exams" ON employee_exams
    FOR SELECT USING (
        get_user_role() IN ('admin', 'admin_assistant')
    );

-- Начальники участков видят экзамены работников своего участка
CREATE POLICY "Section chiefs can view section employee exams" ON employee_exams
    FOR SELECT USING (
        get_user_role() = 'section_chief' 
        AND EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.id = employee_id 
            AND e.section_id = get_user_section_id()
        )
    );

-- Администраторы могут изменять все экзамены
CREATE POLICY "Admins can modify all employee exams" ON employee_exams
    FOR ALL USING (get_user_role() = 'admin');

-- Начальники участков могут предлагать изменения для своего участка
CREATE POLICY "Section chiefs can propose changes" ON employee_exams
    FOR UPDATE USING (
        get_user_role() = 'section_chief' 
        AND EXISTS (
            SELECT 1 FROM employees e 
            WHERE e.id = employee_id 
            AND e.section_id = get_user_section_id()
        )
    );

-- ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ NEWS
-- Все аутентифицированные пользователи могут читать новости
CREATE POLICY "Authenticated users can view news" ON news
    FOR SELECT USING (auth.role() = 'authenticated');

-- Только администраторы могут создавать и изменять новости
CREATE POLICY "Only admins can modify news" ON news
    FOR ALL USING (get_user_role() = 'admin');

-- ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ BACKUPS
-- Только администраторы могут работать с резервными копиями
CREATE POLICY "Only admins can access backups" ON backups
    FOR ALL USING (get_user_role() = 'admin');

-- ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ FORUM_TOPICS
-- Все аутентифицированные пользователи могут читать темы форума
CREATE POLICY "Authenticated users can view forum topics" ON forum_topics
    FOR SELECT USING (auth.role() = 'authenticated');

-- Все аутентифицированные пользователи могут создавать темы
CREATE POLICY "Authenticated users can create forum topics" ON forum_topics
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND author_id = auth.uid());

-- Авторы могут изменять свои темы
CREATE POLICY "Authors can modify own topics" ON forum_topics
    FOR UPDATE USING (author_id = auth.uid());

-- Администраторы могут удалять любые темы
CREATE POLICY "Admins can delete any topics" ON forum_topics
    FOR DELETE USING (get_user_role() = 'admin');

-- ПОЛИТИКИ ДЛЯ ТАБЛИЦЫ FORUM_MESSAGES
-- Все аутентифицированные пользователи могут читать сообщения
CREATE POLICY "Authenticated users can view forum messages" ON forum_messages
    FOR SELECT USING (auth.role() = 'authenticated');

-- Все аутентифицированные пользователи могут создавать сообщения
CREATE POLICY "Authenticated users can create forum messages" ON forum_messages
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND author_id = auth.uid());

-- Авторы могут изменять свои сообщения
CREATE POLICY "Authors can modify own messages" ON forum_messages
    FOR UPDATE USING (author_id = auth.uid());

-- Администраторы могут удалять любые сообщения
CREATE POLICY "Admins can delete any messages" ON forum_messages
    FOR DELETE USING (get_user_role() = 'admin');