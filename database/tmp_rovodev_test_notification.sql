-- Тестовый скрипт для создания уведомления
-- Выполните в Supabase SQL Editor

-- 1. Сначала найдите ID вашего пользователя
SELECT id, full_name, email, role FROM users WHERE is_active = true;

-- 2. Создайте тестовое уведомление (замените USER_ID_HERE на реальный UUID)
INSERT INTO user_notifications (
    user_id, 
    type, 
    title, 
    message, 
    is_read,
    created_at,
    expires_at
) VALUES (
    'USER_ID_HERE', -- Замените на реальный UUID пользователя из шага 1
    'exam_date_pending',
    'Тестовое уведомление для проверки автопоказа',
    'Это тестовое уведомление создано для проверки автоматического показа при входе в систему. Если вы видите это сообщение в модальном окне - система работает корректно!',
    FALSE,
    NOW(),
    NOW() + INTERVAL '7 days'
);

-- 3. Проверьте созданное уведомление
SELECT * FROM user_notifications WHERE user_id = 'USER_ID_HERE' ORDER BY created_at DESC;