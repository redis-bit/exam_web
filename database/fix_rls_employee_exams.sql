-- Исправление RLS политик для employee_exams
-- Выполнить в SQL Editor в Supabase Dashboard

-- 1. Проверяем текущие политики для employee_exams
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'employee_exams' 
AND schemaname = 'public';

-- 2. Удаляем существующие политики для employee_exams
DROP POLICY IF EXISTS "employee_exams_select_policy" ON public.employee_exams;
DROP POLICY IF EXISTS "employee_exams_insert_policy" ON public.employee_exams;
DROP POLICY IF EXISTS "employee_exams_update_policy" ON public.employee_exams;
DROP POLICY IF EXISTS "employee_exams_delete_policy" ON public.employee_exams;

-- 3. Создаем новые политики для employee_exams

-- Политика SELECT: пользователи видят экзамены работников своего участка
CREATE POLICY "employee_exams_select_policy" ON public.employee_exams
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.employees e ON e.section_id = u.section_id
            WHERE u.id = auth.uid()
            AND e.id = employee_exams.employee_id
            AND u.is_active = true
        )
        OR
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'admin_assistant')
            AND u.is_active = true
        )
    );

-- Политика INSERT: разрешаем создание экзаменов для работников своего участка
-- ВАЖНО: также разрешаем создание через триггеры (когда auth.uid() может быть NULL)
CREATE POLICY "employee_exams_insert_policy" ON public.employee_exams
    FOR INSERT
    WITH CHECK (
        -- Разрешаем админам и помощникам
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'admin_assistant')
            AND u.is_active = true
        )
        OR
        -- Разрешаем начальникам участков для своих работников
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.employees e ON e.section_id = u.section_id
            WHERE u.id = auth.uid()
            AND e.id = employee_exams.employee_id
            AND u.role = 'section_chief'
            AND u.is_active = true
        )
        OR
        -- ВАЖНО: Разрешаем создание через триггеры (системные операции)
        auth.uid() IS NULL
    );

-- Политика UPDATE: разрешаем обновление экзаменов
CREATE POLICY "employee_exams_update_policy" ON public.employee_exams
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.employees e ON e.section_id = u.section_id
            WHERE u.id = auth.uid()
            AND e.id = employee_exams.employee_id
            AND u.is_active = true
        )
        OR
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'admin_assistant')
            AND u.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.employees e ON e.section_id = u.section_id
            WHERE u.id = auth.uid()
            AND e.id = employee_exams.employee_id
            AND u.is_active = true
        )
        OR
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'admin_assistant')
            AND u.is_active = true
        )
    );

-- Политика DELETE: только админы могут удалять экзамены
CREATE POLICY "employee_exams_delete_policy" ON public.employee_exams
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'admin_assistant')
            AND u.is_active = true
        )
    );

-- 4. Проверяем, что RLS включен для employee_exams
ALTER TABLE public.employee_exams ENABLE ROW LEVEL SECURITY;

-- 5. Проверяем новые политики
SELECT 
    policyname,
    cmd,
    permissive,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'employee_exams' 
AND schemaname = 'public'
ORDER BY policyname;