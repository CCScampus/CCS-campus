-- Insert admin profile
-- Replace 'YOUR_USER_ID' with the actual UUID of your authenticated user
INSERT INTO public.profiles (id, username, email, name, role)
SELECT 
  id,
  email as username,
  email,
  COALESCE(raw_user_meta_data->>'name', email) as name,
  'admin' as role
FROM auth.users
WHERE id = auth.uid()  -- This will use the current authenticated user's ID
ON CONFLICT (id) DO UPDATE
SET 
  role = 'admin',
  updated_at = now(); 