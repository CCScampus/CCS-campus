-- Function to create admin policies for a table
CREATE OR REPLACE FUNCTION create_admin_policies(table_name text) 
RETURNS void AS $$
BEGIN
    -- View Policy
    EXECUTE format('
        CREATE POLICY "Admin users can view all %I" ON %I
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role = ''admin''
                )
            )', table_name, table_name);

    -- Update Policy
    EXECUTE format('
        CREATE POLICY "Admin users can update all %I" ON %I
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role = ''admin''
                )
            )', table_name, table_name);

    -- Insert Policy
    EXECUTE format('
        CREATE POLICY "Admin users can insert %I" ON %I
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role = ''admin''
                )
            )', table_name, table_name);

    -- Delete Policy
    EXECUTE format('
        CREATE POLICY "Admin users can delete %I" ON %I
            FOR DELETE USING (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role = ''admin''
                )
            )', table_name, table_name);

    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', table_name);
END;
$$ LANGUAGE plpgsql;

-- Drop existing policies if they exist (to avoid conflicts)
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', 
            pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Create admin policies for all relevant tables
SELECT create_admin_policies('students');
SELECT create_admin_policies('fees');
SELECT create_admin_policies('payments');
SELECT create_admin_policies('daily_attendance');
SELECT create_admin_policies('selected_slots');
SELECT create_admin_policies('system_defaults');

-- Special policies for profiles table
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin users can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admin users can update all profiles" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admin users can insert profiles" ON profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admin users can delete profiles" ON profiles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Clean up
DROP FUNCTION create_admin_policies(text);

-- Verify RLS is enabled on all tables
DO $$ 
DECLARE
    tbl record;
BEGIN
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename IN ('students', 'fees', 'payments', 'daily_attendance', 'selected_slots', 'system_defaults', 'profiles')
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl.tablename);
    END LOOP;
END $$; 