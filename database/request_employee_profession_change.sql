CREATE OR REPLACE FUNCTION request_employee_profession_change(
    p_employee_id UUID,
    p_new_profession_id UUID,
    p_requested_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request_id UUID;
BEGIN
    INSERT INTO approval_requests (requester_id, type, related_employee_id, new_value, old_value)
    VALUES (p_requested_by, 'employee_data_change', p_employee_id, jsonb_build_object('profession_template_id', p_new_profession_id), (SELECT to_jsonb(e) FROM employees e WHERE id = p_employee_id))
    RETURNING id INTO v_request_id;

    RETURN v_request_id;
END;
$$;