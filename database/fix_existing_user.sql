-- Скрипт для добавления существующего пользователя в таблицу users
-- Замените данные на актуальные для вашего пользователя

-- Сначала найдем пользователя в auth.users
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
WHERE email = 'ваш_email@example.com'; -- Замените на реальный email

-- Добавляем пользователя в таблицу users (замените UUID и данные)
SELECT add_existing_auth_user_to_users(
  'USER_ID_FROM_AUTH_USERS'::uuid,  -- Замените на ID из предыдущего запроса
  'Имя Фамилия',                    -- Замените на реальное имя
  'section_chief',                  -- Роль пользователя
  NULL                              -- ID участка (если нужен)
);

-- Проверяем, что пользователь добавлен
SELECT id, full_name, email, role, section_id, is_active, created_at
FROM users
WHERE email = 'ваш_email@example.com'; -- Замените на реальный email