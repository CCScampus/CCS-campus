-- First, let's check if we have any profiles
DO $$
DECLARE
    profile_count INTEGER;
    user_count INTEGER;
    first_user_id UUID;
    first_user_email TEXT;
BEGIN
    -- Check if profiles table exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        -- Create profiles table if it doesn't exist
        CREATE TABLE public.profiles (
            id uuid not null references auth.users on delete cascade,
            username text,
            email text,
            name text,
            role text not null check (role in ('admin', 'staff')) default 'staff',
            created_at timestamp with time zone default timezone('utc'::text, now()) not null,
            updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
            primary key (id),
            unique(username),
            unique(email)
        );

        -- Create trigger for updated_at
        CREATE TRIGGER update_profiles_updated_at
            BEFORE UPDATE ON profiles
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        -- Create RLS policies
        CREATE POLICY "Users can view their own profile" ON profiles
            FOR SELECT USING (auth.uid() = id);

        CREATE POLICY "Users can update their own profile" ON profiles
            FOR UPDATE USING (auth.uid() = id);

        -- Enable RLS
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Count existing profiles
    SELECT COUNT(*) INTO profile_count FROM public.profiles;
    
    -- Count existing users
    SELECT COUNT(*) INTO user_count FROM auth.users;
    
    -- Get first user's info if exists
    SELECT id, email INTO first_user_id, first_user_email 
    FROM auth.users 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- If we have users but no profiles, create admin profile for first user
    IF user_count > 0 AND profile_count = 0 AND first_user_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, username, email, name, role)
        VALUES (
            first_user_id,
            first_user_email,
            first_user_email,
            first_user_email,
            'admin'
        );
        
        RAISE NOTICE 'Created admin profile for user %', first_user_email;
    END IF;
END $$;

-- Now let's verify the profiles
SELECT id, email, role, created_at 
FROM public.profiles 
ORDER BY created_at ASC; 