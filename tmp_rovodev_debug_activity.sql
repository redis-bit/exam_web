-- Проверка функций активности пользователей
-- Выполнить в SQL Editor в Supabase Dashboard для диагностики

-- 1. Проверяем, существуют ли функции
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name IN ('update_user_last_action', 'update_user_last_visit', 'sync_last_sign_in_times')
ORDER BY routine_name;

-- 2. Проверяем текущие данные пользователей
SELECT 
    id,
    full_name,
    email,
    last_visit_at,
    last_action_at,
    activity_rating,
    created_at
FROM users 
ORDER BY last_action_at DESC NULLS LAST
LIMIT 10;

-- 3. Тестируем функцию update_user_last_action для конкретного пользователя
-- ЗАМЕНИТЕ 'ваш-user-id' на реальный ID пользователя
DO $$
DECLARE
    test_user_id UUID;
    result BOOLEAN;
BEGIN
    -- Получаем первого активного пользователя
    SELECT id INTO test_user_id FROM users WHERE is_active = true LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Тестируем функцию
        SELECT update_user_last_action(test_user_id) INTO result;
        
        RAISE NOTICE 'Тест функции update_user_last_action для пользователя %: %', test_user_id, result;
        
        -- Проверяем результат
        PERFORM pg_sleep(1); -- Небольшая пауза
        
        -- Показываем обновленные данные
        DECLARE
            user_last_action TIMESTAMPTZ;
            user_activity_rating INTEGER;
        BEGIN
            SELECT last_action_at, activity_rating 
            INTO user_last_action, user_activity_rating
            FROM users 
            WHERE id = test_user_id;
            
            RAISE NOTICE 'Обновленные данные пользователя:';
            RAISE NOTICE 'last_action_at: %, activity_rating: %', user_last_action, user_activity_rating;
        END;
    ELSE
        RAISE NOTICE 'Не найдено активных пользователей для тестирования';
    END IF;
END $$;

-- 4. Проверяем права доступа к функциям
SELECT 
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges 
WHERE routine_name IN ('update_user_last_action', 'update_user_last_visit')
ORDER BY routine_name, grantee;