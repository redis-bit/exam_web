-- Fix for Security Advisor Issues reported on 2025-08-01

-- 1. Fix for user_notifications RLS
-- Issue: "Policy Exists RLS Disabled" and "RLS Disabled in Public"
-- Solution: Enable RLS and add policies.

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications FORCE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can manage their own notifications" ON public.user_notifications;


-- Allow users to see their own notifications
CREATE POLICY "Users can view their own notifications"
    ON public.user_notifications FOR SELECT
    USING (user_id = auth.uid());

-- Allow admins and assistants to see all notifications
CREATE POLICY "Admins can view all notifications"
    ON public.user_notifications FOR SELECT
    USING (get_user_role() IN ('admin', 'admin_assistant'));

-- Allow users to mark their own notifications as read (UPDATE) or delete them
CREATE POLICY "Users can manage their own notifications"
    ON public.user_notifications FOR ALL
    USING (user_id = auth.uid());


-- 2. Fix for "Security Definer View" issues
-- Solution: Recreate views with explicit SECURITY INVOKER option.

-- Recreate exam_status_view
-- Definition from database/fix_exam_status_view.sql
DROP VIEW IF EXISTS public.exam_status_view;
CREATE OR REPLACE VIEW public.exam_status_view
WITH (security_invoker = true)
AS
SELECT
    ee.id,
    ee.employee_id,
    ee.exam_id,
    e.full_name as employee_name,
    ex.name as exam_name,
    ee.exam_date,
    ee.next_exam_date,
    ee.pending_date,
    ee.pending_until,
    ee.updated_by,
    ee.updated_at,
    s.name as section_name,
    pt.name as profession_name,
    CASE
        WHEN ee.next_exam_date < CURRENT_DATE THEN 'overdue'
        WHEN ee.next_exam_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'upcoming'
        WHEN ee.pending_date IS NOT NULL THEN 'pending'
        ELSE 'normal'
    END as status,
    CASE
        WHEN ee.next_exam_date < CURRENT_DATE THEN 'red'
        WHEN ee.next_exam_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'yellow'
        WHEN ee.pending_date IS NOT NULL THEN 'blue'
        ELSE 'green'
    END as color_indicator
FROM public.employee_exams ee
JOIN public.employees e ON e.id = ee.employee_id
JOIN public.exams ex ON ex.id = ee.exam_id
JOIN public.sections s ON s.id = e.section_id
JOIN public.profession_templates pt ON pt.id = e.profession_template_id
WHERE e.is_active = true;


-- Recreate admin_approval_queue
-- Definition from database/07_update_approval_view.sql
DROP VIEW IF EXISTS public.admin_approval_queue;
CREATE OR REPLACE VIEW public.admin_approval_queue
WITH (security_invoker = true)
AS
SELECT
    ar.id,
    ar.type,
    ar.created_at,
    ar.expires_at,
    u.full_name as requester_name,
    u.email as requester_email,
    COALESCE(
        CASE WHEN ar.type = 'employee_create' THEN s_new.name ELSE s_emp.name END,
        'Неизвестный участок'
    ) as section_name,
    COALESCE(e.full_name, ar.new_value->>'full_name') as employee_name,
    ex.name as exam_name,
    ar.old_value,
    ar.new_value,
    EXTRACT(EPOCH FROM (ar.expires_at - NOW()))/3600 as hours_until_expiry
FROM approval_requests ar
JOIN users u ON u.id = ar.requested_by
LEFT JOIN employees e ON e.id = ar.employee_id
LEFT JOIN sections s_emp ON s_emp.id = e.section_id
LEFT JOIN sections s_new ON s_new.id = (ar.new_value->>'section_id')::UUID
LEFT JOIN exams ex ON ex.id = ar.exam_id
WHERE ar.status = 'pending' AND ar.expires_at > NOW()
ORDER BY ar.created_at ASC;


-- Recreate users_with_activity_stats
-- Definition from database/fix_user_activity_counters.sql
DROP VIEW IF EXISTS public.users_with_activity_stats;
CREATE OR REPLACE VIEW public.users_with_activity_stats
WITH (security_invoker = true)
AS
SELECT
  u.id,
  u.full_name,
  u.email,
  u.section_id,
  u.role,
  u.created_at,
  u.last_action_at,
  u.last_visit_at,
  u.is_active,
  u.activity_rating,
  s.name as section_name,
  COALESCE(u.employees_created, 0) as employees_created,
  COALESCE(u.exam_dates_approved, 0) as exam_dates_approved,
  COALESCE(u.requests_rejected, 0) as requests_rejected
FROM users u
LEFT JOIN sections s ON u.section_id = s.id;
