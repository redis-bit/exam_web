-- Функция и триггер для автоматического создания профиля пользователя
-- Выполнить в SQL Editor в Supabase Dashboard

-- Функция для создания профиля пользователя при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Создаем запись в таблице users для нового пользователя из auth.users
  INSERT INTO public.users (
    id,
    full_name,
    email,
    role,
    section_id,
    is_active,
    created_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Новый пользователь'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'section_chief')::user_role,
    CASE 
      WHEN NEW.raw_user_meta_data->>'section_id' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'section_id')::uuid
      ELSE NULL
    END,
    true,
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем триггер на таблицу auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Функция для добавления существующего пользователя в таблицу users
CREATE OR REPLACE FUNCTION add_existing_auth_user_to_users(
  auth_user_id UUID,
  user_full_name TEXT DEFAULT 'Пользователь',
  user_role TEXT DEFAULT 'section_chief',
  user_section_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Получаем email из auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth_user_id;
  
  IF user_email IS NULL THEN
    RAISE EXCEPTION 'Пользователь с ID % не найден в auth.users', auth_user_id;
  END IF;
  
  -- Проверяем, есть ли уже запись в users
  IF EXISTS (SELECT 1 FROM public.users WHERE id = auth_user_id) THEN
    RAISE EXCEPTION 'Пользователь с ID % уже существует в таблице users', auth_user_id;
  END IF;
  
  -- Создаем запись в таблице users
  INSERT INTO public.users (
    id,
    full_name,
    email,
    role,
    section_id,
    is_active,
    created_at
  ) VALUES (
    auth_user_id,
    user_full_name,
    user_email,
    user_role::user_role,
    user_section_id,
    true,
    NOW()
  );
  
  RETURN auth_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Даем права на выполнение функций
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_existing_auth_user_to_users(UUID, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_existing_auth_user_to_users(UUID, TEXT, TEXT, UUID) TO service_role;