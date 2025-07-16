-- Тестовые данные для системы учёта экзаменов
-- Выполнять в SQL Editor в Supabase Dashboard после создания таблиц и политик

-- 1. Создание участков
INSERT INTO sections (name) VALUES 
('Участок №1 - Производство'),
('Участок №2 - Склад'),
('Участок №3 - Техническое обслуживание');

-- 2. Создание экзаменов
INSERT INTO exams (name, periodicity) VALUES 
('Охрана труда', 365),
('Пожарная безопасность', 365),
('Электробезопасность', 1095), -- 3 года
('Промышленная безопасность', 1095),
('Первая медицинская помощь', 1095),
('Работа на высоте', 365),
('Экологическая безопасность', 1095),
('Безопасность дорожного движения', 365);

-- 3. Создание шаблонов профессий
INSERT INTO profession_templates (name, section_id) VALUES 
('Слесарь-ремонтник', (SELECT id FROM sections WHERE name = 'Участок №1 - Производство')),
('Электрик', (SELECT id FROM sections WHERE name = 'Участок №1 - Производство')),
('Кладовщик', (SELECT id FROM sections WHERE name = 'Участок №2 - Склад')),
('Водитель погрузчика', (SELECT id FROM sections WHERE name = 'Участок №2 - Склад')),
('Слесарь КИПиА', (SELECT id FROM sections WHERE name = 'Участок №3 - Техническое обслуживание')),
('Механик', (SELECT id FROM sections WHERE name = 'Участок №3 - Техническое обслуживание'));

-- 4. Связывание профессий с экзаменами
-- Слесарь-ремонтник
INSERT INTO profession_exams (profession_template_id, exam_id) VALUES 
((SELECT id FROM profession_templates WHERE name = 'Слесарь-ремонтник'), (SELECT id FROM exams WHERE name = 'Охрана труда')),
((SELECT id FROM profession_templates WHERE name = 'Слесарь-ремонтник'), (SELECT id FROM exams WHERE name = 'Пожарная безопасность')),
((SELECT id FROM profession_templates WHERE name = 'Слесарь-ремонтник'), (SELECT id FROM exams WHERE name = 'Промышленная безопасность')),
((SELECT id FROM profession_templates WHERE name = 'Слесарь-ремонтник'), (SELECT id FROM exams WHERE name = 'Первая медицинская помощь'));

-- Электрик
INSERT INTO profession_exams (profession_template_id, exam_id) VALUES 
((SELECT id FROM profession_templates WHERE name = 'Электрик'), (SELECT id FROM exams WHERE name = 'Охрана труда')),
((SELECT id FROM profession_templates WHERE name = 'Электрик'), (SELECT id FROM exams WHERE name = 'Пожарная безопасность')),
((SELECT id FROM profession_templates WHERE name = 'Электрик'), (SELECT id FROM exams WHERE name = 'Электробезопасность')),
((SELECT id FROM profession_templates WHERE name = 'Электрик'), (SELECT id FROM exams WHERE name = 'Первая медицинская помощь'));

-- Кладовщик
INSERT INTO profession_exams (profession_template_id, exam_id) VALUES 
((SELECT id FROM profession_templates WHERE name = 'Кладовщик'), (SELECT id FROM exams WHERE name = 'Охрана труда')),
((SELECT id FROM profession_templates WHERE name = 'Кладовщик'), (SELECT id FROM exams WHERE name = 'Пожарная безопасность')),
((SELECT id FROM profession_templates WHERE name = 'Кладовщик'), (SELECT id FROM exams WHERE name = 'Первая медицинская помощь'));

-- Водитель погрузчика
INSERT INTO profession_exams (profession_template_id, exam_id, periodicity_override) VALUES 
((SELECT id FROM profession_templates WHERE name = 'Водитель погрузчика'), (SELECT id FROM exams WHERE name = 'Охрана труда'), NULL),
((SELECT id FROM profession_templates WHERE name = 'Водитель погрузчика'), (SELECT id FROM exams WHERE name = 'Пожарная безопасность'), NULL),
((SELECT id FROM profession_templates WHERE name = 'Водитель погрузчика'), (SELECT id FROM exams WHERE name = 'Безопасность дорожного движения'), 180), -- каждые 6 месяцев
((SELECT id FROM profession_templates WHERE name = 'Водитель погрузчика'), (SELECT id FROM exams WHERE name = 'Первая медицинская помощь'), NULL);

-- Слесарь КИПиА
INSERT INTO profession_exams (profession_template_id, exam_id) VALUES 
((SELECT id FROM profession_templates WHERE name = 'Слесарь КИПиА'), (SELECT id FROM exams WHERE name = 'Охрана труда')),
((SELECT id FROM profession_templates WHERE name = 'Слесарь КИПиА'), (SELECT id FROM exams WHERE name = 'Пожарная безопасность')),
((SELECT id FROM profession_templates WHERE name = 'Слесарь КИПиА'), (SELECT id FROM exams WHERE name = 'Электробезопасность')),
((SELECT id FROM profession_templates WHERE name = 'Слесарь КИПиА'), (SELECT id FROM exams WHERE name = 'Промышленная безопасность')),
((SELECT id FROM profession_templates WHERE name = 'Слесарь КИПиА'), (SELECT id FROM exams WHERE name = 'Первая медицинская помощь'));

-- Механик
INSERT INTO profession_exams (profession_template_id, exam_id) VALUES 
((SELECT id FROM profession_templates WHERE name = 'Механик'), (SELECT id FROM exams WHERE name = 'Охрана труда')),
((SELECT id FROM profession_templates WHERE name = 'Механик'), (SELECT id FROM exams WHERE name = 'Пожарная безопасность')),
((SELECT id FROM profession_templates WHERE name = 'Механик'), (SELECT id FROM exams WHERE name = 'Промышленная безопасность')),
((SELECT id FROM profession_templates WHERE name = 'Механик'), (SELECT id FROM exams WHERE name = 'Работа на высоте')),
((SELECT id FROM profession_templates WHERE name = 'Механик'), (SELECT id FROM exams WHERE name = 'Первая медицинская помощь'));

-- 5. Создание тестовых работников
INSERT INTO employees (full_name, profession_template_id, section_id) VALUES 
('Иванов Иван Иванович', 
 (SELECT id FROM profession_templates WHERE name = 'Слесарь-ремонтник'), 
 (SELECT id FROM sections WHERE name = 'Участок №1 - Производство')),
('Петров Петр Петрович', 
 (SELECT id FROM profession_templates WHERE name = 'Электрик'), 
 (SELECT id FROM sections WHERE name = 'Участок №1 - Производство')),
('Сидоров Сидор Сидорович', 
 (SELECT id FROM profession_templates WHERE name = 'Кладовщик'), 
 (SELECT id FROM sections WHERE name = 'Участок №2 - Склад')),
('Козлов Николай Александрович', 
 (SELECT id FROM profession_templates WHERE name = 'Водитель погрузчика'), 
 (SELECT id FROM sections WHERE name = 'Участок №2 - Склад')),
('Морозов Алексей Викторович', 
 (SELECT id FROM profession_templates WHERE name = 'Слесарь КИПиА'), 
 (SELECT id FROM sections WHERE name = 'Участок №3 - Техническое обслуживание')),
('Волков Дмитрий Сергеевич', 
 (SELECT id FROM profession_templates WHERE name = 'Механик'), 
 (SELECT id FROM sections WHERE name = 'Участок №3 - Техническое обслуживание'));

-- 6. Создание тестовых новостей
INSERT INTO news (title, content, author_id) VALUES 
('Добро пожаловать в систему учёта экзаменов!', 
 'Система успешно запущена. Теперь вы можете отслеживать сроки сдачи экзаменов ваших работников.',
 NULL), -- author_id будет установлен после создания пользователей
('Обновление требований по охране труда', 
 'С 1 января вступают в силу новые требования по охране труда. Всем работникам необходимо пройти дополнительное обучение.',
 NULL),
('Плановые проверки в феврале', 
 'В феврале запланированы плановые проверки знаний по пожарной безопасности для всех участков.',
 NULL);

-- 7. Создание тестовых тем форума
INSERT INTO forum_topics (title, content, author_id) VALUES 
('Вопросы по работе с системой', 
 'В этой теме можно задавать вопросы по работе с системой учёта экзаменов.',
 NULL),
('Предложения по улучшению', 
 'Ваши предложения по улучшению функционала системы.',
 NULL),
('Обсуждение изменений в законодательстве', 
 'Обсуждаем изменения в законодательстве, влияющие на требования к обучению работников.',
 NULL);

-- Примечание: Пользователи должны быть созданы через Supabase Auth
-- После создания пользователей через интерфейс, их данные нужно будет добавить в таблицу users
-- Пример команд для добавления пользователей (выполнять после регистрации через Auth):

/*
-- Добавление администратора (замените UUID на реальный из auth.users)
INSERT INTO users (id, full_name, email, section_id, role) VALUES 
('ваш-uuid-администратора', 'Администратор Системы', 'admin@company.com', 
 (SELECT id FROM sections WHERE name = 'Участок №1 - Производство'), 'admin');

-- Добавление начальника участка
INSERT INTO users (id, full_name, email, section_id, role) VALUES 
('ваш-uuid-начальника', 'Начальник Участка', 'chief@company.com', 
 (SELECT id FROM sections WHERE name = 'Участок №1 - Производство'), 'section_chief');

-- Обновление author_id в новостях и форуме
UPDATE news SET author_id = 'ваш-uuid-администратора';
UPDATE forum_topics SET author_id = 'ваш-uuid-администратора';
*/