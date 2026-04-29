-- ============================================
-- CHECK USERS - BNI Grow Visitor
-- ============================================
-- Run this to see all users in the database

-- List all users
SELECT 
  id, 
  name, 
  email, 
  role, 
  phone, 
  is_active,
  created_at
FROM users
ORDER BY created_at DESC;

-- Check specifically for admin user
SELECT 
  id, 
  name, 
  email, 
  role, 
  password_hash,
  is_active
FROM users
WHERE email = 'admin@bnigrow.com';

-- Count total users
SELECT COUNT(*) as total_users FROM users;

-- Check if RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'visitors', 'meetings');
