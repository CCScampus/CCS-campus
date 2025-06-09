-- First disable RLS on daily_attendance table to ensure we can access it
ALTER TABLE IF EXISTS daily_attendance DISABLE ROW LEVEL SECURITY;

-- Recreate the profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    username text,
    email text,
    name text,
    role text NOT NULL CHECK (role IN ('admin', 'staff')) DEFAULT 'staff',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE(username),
    UNIQUE(email)
);

-- Disable RLS on profiles table
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;

-- Disable RLS on other tables that might have it enabled
ALTER TABLE IF EXISTS students DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fees DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS selected_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_defaults DISABLE ROW LEVEL SECURITY; 