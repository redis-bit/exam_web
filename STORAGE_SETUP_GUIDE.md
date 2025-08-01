# Настройка Supabase Storage для резервного копирования

## Проблема
Ошибка: `Bucket not found` при создании резервной копии.

## Решение

### Вариант 1: Через Supabase Dashboard (Рекомендуется)

1. **Откройте Supabase Dashboard**
   - Перейдите на https://supabase.com/dashboard
   - Выберите ваш проект

2. **Создайте Storage Bucket**
   - Перейдите в раздел "Storage" в левом меню
   - Нажмите "Create bucket"
   - Введите имя: `backups`
   - Снимите галочку "Public bucket" (должен быть приватным)
   - Нажмите "Create bucket"

3. **Настройте политики доступа**
   - В созданном bucket нажмите на иконку настроек
   - Перейдите в "Policies"
   - Создайте новую политику:
     - **Name**: `Admins can manage backups`
     - **Policy**: `FOR ALL`
     - **Target roles**: `authenticated`
     - **USING expression**:
       ```sql
       auth.uid() IN (
         SELECT id FROM users WHERE role = 'admin'
       )
       ```

### Вариант 2: Через SQL Editor

1. **Откройте SQL Editor**
   - В Supabase Dashboard перейдите в "SQL Editor"

2. **Выполните SQL команды**
   ```sql
   -- Создаем bucket для резервных копий
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('backups', 'backups', false);

   -- Создаем политику для администраторов
   CREATE POLICY "Admins can manage backups" ON storage.objects
   FOR ALL USING (
     bucket_id = 'backups' 
     AND auth.uid() IN (
       SELECT id FROM users WHERE role = 'admin'
     )
   );
   ```

### Проверка настройки

1. **Проверьте создание bucket**
   ```sql
   SELECT * FROM storage.buckets WHERE name = 'backups';
   ```

2. **Проверьте политики**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%backup%';
   ```

## После настройки

1. **Обновите страницу** в браузере
2. **Попробуйте создать резервную копию** снова
3. **Проверьте консоль** на отсутствие ошибок

## Возможные проблемы

### Ошибка прав доступа
- Убедитесь, что пользователь имеет роль 'admin'
- Проверьте политики RLS

### Ошибка размера файла
- Проверьте лимиты Storage в вашем плане Supabase
- Для Free план: до 1GB

### Ошибка сети
- Проверьте подключение к интернету
- Убедитесь, что Supabase проект активен