-- =================================================================
-- SECURITY LOGS TABLE MIGRATION
-- Version: 1.0
-- Description: Adds security logging capabilities for authentication events
-- =================================================================

-- Create security logs table
CREATE TABLE IF NOT EXISTS public.security_logs (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    event_type TEXT NOT NULL,
    user_email TEXT,
    ip_address INET,
    user_agent TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Add comments
COMMENT ON TABLE public.security_logs IS 'Logs security events for monitoring and auditing';
COMMENT ON COLUMN public.security_logs.event_type IS 'Type of security event (LOGIN_SUCCESS, LOGIN_FAILED, etc.)';
COMMENT ON COLUMN public.security_logs.user_email IS 'Email of the user involved in the event';
COMMENT ON COLUMN public.security_logs.ip_address IS 'IP address of the request';
COMMENT ON COLUMN public.security_logs.user_agent IS 'User agent string from the request';
COMMENT ON COLUMN public.security_logs.details IS 'Additional event details in JSON format';
-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON public.security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_email ON public.security_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON public.security_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_security_logs_ip_address ON public.security_logs(ip_address);
-- Enable RLS
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
-- Create policy for admin access only
CREATE POLICY "Admin access only" ON public.security_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.email = auth.jwt() ->> 'email' 
            AND profiles.role = 'admin'
        )
    );
-- Grant permissions
GRANT SELECT ON public.security_logs TO authenticated;
GRANT INSERT ON public.security_logs TO service_role;
-- Create function to clean old logs (optional - for maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_old_security_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.security_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
COMMENT ON FUNCTION public.cleanup_old_security_logs IS 'Removes security logs older than specified days (default 90)';
-- Grant execute permission to service role for cleanup function
GRANT EXECUTE ON FUNCTION public.cleanup_old_security_logs TO service_role;
