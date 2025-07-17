-- Функция для создания пользователя с подтвержденным email
-- Выполнить в SQL Editor в Supabase Dashboard

-- Создаем функцию для создания пользователя в auth.users с подтвержденным email
CREATE OR REPLACE FUNCTION create_confirmed_user(
    user_email TEXT,
    user_password TEXT,
    user_full_name TEXT,
    user_role TEXT,
    user_section_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
    encrypted_password TEXT;
BEGIN
    -- Генерируем новый UUID для пользователя
    new_user_id := gen_random_uuid();
    
    -- Хешируем пароль (используем простое хеширование для демо)
    encrypted_password := crypt(user_password, gen_salt('bf'));
    
    -- Создаем пользователя в auth.users с подтвержденным email
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role,
        aud
    ) VALUES (
        new_user_id,
        '00000000-0000-0000-0000-000000000000',
        user_email,
        encrypted_password,
        NOW(), -- Сразу подтверждаем email
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        jsonb_build_object('full_name', user_full_name, 'role', user_role),
        false,
        'authenticated',
        'authenticated'
    );
    
    -- Создаем запись в auth.identities
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        new_user_id,
        jsonb_build_object('sub', new_user_id::text, 'email', user_email),
        'email',
        NOW(),
        NOW()
    );
    
    -- Создаем пользователя в нашей таблице users
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

-- Даем права на выполнение функции
GRANT EXECUTE ON FUNCTION create_confirmed_user TO authenticated;
GRANT EXECUTE ON FUNCTION create_confirmed_user TO service_role;