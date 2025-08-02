-- Fix for Auth Security Settings
-- This script addresses the auth security warnings from the CSV file

-- 1. Enable leaked password protection
-- Note: This needs to be done through Supabase Dashboard > Authentication > Settings
-- Or via the Management API. SQL cannot directly modify auth configuration.

-- For reference, this would be done via API call:
-- PATCH https://api.supabase.com/v1/projects/{ref}/config/auth
-- {
--   "SECURITY_LEAKED_PASSWORD_PROTECTION": true
-- }

-- 2. Enable additional MFA options
-- Note: This also needs to be done through Supabase Dashboard > Authentication > Settings
-- Or via the Management API.

-- For reference, MFA settings via API:
-- PATCH https://api.supabase.com/v1/projects/{ref}/config/auth
-- {
--   "MFA_ENABLED": true,
--   "MFA_MAX_ENROLLED_FACTORS": 10
-- }

-- Since we cannot modify auth settings via SQL, we'll create a reminder function
CREATE OR REPLACE FUNCTION check_auth_security_settings()
RETURNS TABLE(
    setting_name TEXT,
    current_status TEXT,
    recommendation TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY VALUES
        ('Leaked Password Protection', 'UNKNOWN - Check Dashboard', 'Enable in Auth Settings'),
        ('MFA Options', 'UNKNOWN - Check Dashboard', 'Enable TOTP and other MFA methods'),
        ('Password Strength', 'UNKNOWN - Check Dashboard', 'Ensure minimum requirements are set');
END;
$$;

-- Create a function to remind admins about security settings
CREATE OR REPLACE FUNCTION get_security_recommendations()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN 'SECURITY RECOMMENDATIONS:
    
1. Enable Leaked Password Protection:
   - Go to Supabase Dashboard > Authentication > Settings
   - Enable "Leaked Password Protection"
   
2. Configure MFA Options:
   - Go to Supabase Dashboard > Authentication > Settings
   - Enable "Multi-Factor Authentication"
   - Configure TOTP and other MFA methods
   
3. Set Password Requirements:
   - Ensure minimum password length is set
   - Consider requiring special characters
   
4. Review RLS Policies:
   - Ensure all tables have appropriate RLS policies
   - Test policies with different user roles
   
5. Monitor Function Security:
   - All functions now have SET search_path = ''''
   - Review function permissions regularly';
END;
$$;

COMMENT ON FUNCTION check_auth_security_settings() IS 'Check current auth security settings status';
COMMENT ON FUNCTION get_security_recommendations() IS 'Get security recommendations for administrators';