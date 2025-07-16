-- Получение UUID созданных пользователей
-- Выполните этот запрос после создания пользователей через Authentication

SELECT 
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users
ORDER BY created_at;