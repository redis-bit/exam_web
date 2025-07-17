-- Альтернативный способ создания пользователей без внешних ключей
-- Выполнить если основной способ не работает

-- 1. Создаем упрощенную функцию создания пользователя
CREATE OR REPLACE FUNCTION create_simple_user(
    user_email TEXT,
    user_full_name TEXT,
    user_role TEXT DEFAULT 'section_chief',
    user_section_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Генерируем новый UUID
    new_user_id := gen_random_uuid();
    
    -- Проверяем уникальность email
    IF EXISTS (SELECT 1 FROM public.users WHERE email = user_email) THEN
        RAISE EXCEPTION 'Email % уже используется', user_email;
    END IF;
    
    -- Простая вставка без сложных преобразований
    INSERT INTO public.users (
        id,
        full_name,
        email,
        role,
        section_id,
        is_active,
        created_at
    ) VALUES (
        new_user_id,
        user_full_name,
        user_email,
        user_role::user_role,
        user_section_id,
        true,
        NOW()
    );
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Функция для прямого добавления в таблицу users
CREATE OR REPLACE FUNCTION add_user_direct(
    p_email TEXT,
    p_full_name TEXT,
    p_role TEXT DEFAULT 'section_chief'
) RETURNS TEXT AS $$
DECLARE
    result_message TEXT;
    new_id UUID;
BEGIN
    new_id := gen_random_uuid();
    
    INSERT INTO public.users (id, full_name, email, role, is_active, created_at)
    VALUES (new_id, p_full_name, p_email, p_role::user_role, true, NOW());
    
    result_message := 'Пользователь ' || p_email || ' создан с ID: ' || new_id;
    RETURN result_message;
    
EXCEPTION WHEN OTHERS THEN
    RETURN 'Ошибка: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Даем права
GRANT EXECUTE ON FUNCTION create_simple_user(TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_direct(TEXT, TEXT, TEXT) TO authenticated;

-- 4. Тестируем простое создание
SELECT create_simple_user(
    'simple_test@example.com',
    'Простой тестовый пользователь',
    'section_chief',
    NULL
);

-- 5. Тестируем прямое добавление
SELECT add_user_direct(
    'direct_test@example.com',
    'Прямой тестовый пользователь',
    'section_chief'
);

-- 6. Проверяем результаты
SELECT 
    id,
    full_name,
    email,
    role,
    is_active,
    created_at
FROM public.users 
WHERE email IN ('simple_test@example.com', 'direct_test@example.com')
ORDER BY created_at DESC;