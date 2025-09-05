-- Create app_settings table for application configuration
-- This table stores system-wide configuration settings

CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    description TEXT,
    category TEXT DEFAULT 'General',
    is_public BOOLEAN DEFAULT false,
    data_type TEXT DEFAULT 'string' CHECK (data_type IN ('string', 'number', 'boolean', 'json', 'array')),
    updated_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_app_settings_category ON public.app_settings(category);
CREATE INDEX IF NOT EXISTS idx_app_settings_is_public ON public.app_settings(is_public);
CREATE INDEX IF NOT EXISTS idx_app_settings_updated_at ON public.app_settings(updated_at);

-- Enable Row Level Security
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Everyone can view public settings
CREATE POLICY "app_settings_select_public" ON public.app_settings
    FOR SELECT
    TO authenticated
    USING (is_public = true);

-- Only admins can view all settings
CREATE POLICY "app_settings_select_admin" ON public.app_settings
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Only admins can insert settings
CREATE POLICY "app_settings_insert_admin" ON public.app_settings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Only admins can update settings
CREATE POLICY "app_settings_update_admin" ON public.app_settings
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Only admins can delete settings
CREATE POLICY "app_settings_delete_admin" ON public.app_settings
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Service role can manage all settings
CREATE POLICY "app_settings_service_role_all" ON public.app_settings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_app_settings_updated_at();

-- Create function to get setting value with type casting
CREATE OR REPLACE FUNCTION public.get_setting_value(p_key TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT value
    FROM public.app_settings
    WHERE key = p_key
    AND (is_public = true OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'Admin'
    ));
$$;

-- Create function to get setting value with type casting
CREATE OR REPLACE FUNCTION public.get_setting_value_typed(p_key TEXT, p_type TEXT DEFAULT 'string')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    setting_value TEXT;
    result_value TEXT;
BEGIN
    SELECT value INTO setting_value
    FROM public.app_settings
    WHERE key = p_key
    AND (is_public = true OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'Admin'
    ));
    
    IF setting_value IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Type casting based on data_type
    CASE p_type
        WHEN 'boolean' THEN
            result_value := CASE 
                WHEN LOWER(setting_value) IN ('true', '1', 'yes', 'on') THEN 'true'
                ELSE 'false'
            END;
        WHEN 'number' THEN
            -- Validate that it's a number
            IF setting_value ~ '^[0-9]+\.?[0-9]*$' THEN
                result_value := setting_value;
            ELSE
                result_value := '0';
            END IF;
        ELSE
            result_value := setting_value;
    END CASE;
    
    RETURN result_value;
END;
$$;

-- Create function to set setting value
CREATE OR REPLACE FUNCTION public.set_setting_value(
    p_key TEXT,
    p_value TEXT,
    p_description TEXT DEFAULT NULL,
    p_category TEXT DEFAULT 'General',
    p_is_public BOOLEAN DEFAULT false,
    p_data_type TEXT DEFAULT 'string'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'Admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can modify app settings';
    END IF;
    
    -- Insert or update the setting
    INSERT INTO public.app_settings (
        key, value, description, category, is_public, data_type, updated_by, updated_at
    ) VALUES (
        p_key, p_value, p_description, p_category, p_is_public, p_data_type, auth.uid(), NOW()
    )
    ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        description = COALESCE(EXCLUDED.description, app_settings.description),
        category = COALESCE(EXCLUDED.category, app_settings.category),
        is_public = EXCLUDED.is_public,
        data_type = EXCLUDED.data_type,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at;
    
    RETURN true;
END;
$$;

-- Insert default application settings
INSERT INTO public.app_settings (key, value, description, category, is_public, data_type) VALUES
    ('app_name', 'Nest by Eden Oasis', 'Application name', 'Branding', true, 'string'),
    ('app_version', '1.0.0', 'Application version', 'System', true, 'string'),
    ('maintenance_mode', 'false', 'Enable maintenance mode', 'System', false, 'boolean'),
    ('max_request_duration_days', '30', 'Maximum request duration in days', 'Limits', false, 'number'),
    ('auto_approve_requests', 'false', 'Automatically approve requests', 'Workflow', false, 'boolean'),
    ('notification_email_enabled', 'true', 'Enable email notifications', 'Notifications', false, 'boolean'),
    ('notification_push_enabled', 'true', 'Enable push notifications', 'Notifications', false, 'boolean'),
    ('default_checkout_duration_hours', '24', 'Default checkout duration in hours', 'Limits', false, 'number'),
    ('require_admin_approval', 'true', 'Require admin approval for requests', 'Workflow', false, 'boolean'),
    ('allow_self_checkout', 'false', 'Allow users to check out equipment themselves', 'Workflow', false, 'boolean')
ON CONFLICT (key) DO NOTHING;

-- Add comments
COMMENT ON TABLE public.app_settings IS 'Application configuration settings';
COMMENT ON COLUMN public.app_settings.key IS 'Unique setting key identifier';
COMMENT ON COLUMN public.app_settings.value IS 'Setting value as text';
COMMENT ON COLUMN public.app_settings.description IS 'Human-readable description of the setting';
COMMENT ON COLUMN public.app_settings.category IS 'Category for grouping related settings';
COMMENT ON COLUMN public.app_settings.is_public IS 'Whether this setting is visible to all users';
COMMENT ON COLUMN public.app_settings.data_type IS 'Expected data type: string, number, boolean, json, array';
COMMENT ON COLUMN public.app_settings.updated_by IS 'User who last updated this setting';

