-- ============================================
-- INSERT ADMIN USER - FIXED VERSION
-- ============================================
-- Run this in Supabase SQL Editor

-- First, check if table exists and is accessible
SELECT COUNT(*) FROM users;

-- Insert admin user with explicit UUID
INSERT INTO users (id, name, email, password_hash, role, phone, is_active) 
VALUES (
  gen_random_uuid(),
  'Admin BNI Grow',
  'admin@bnigrow.com',
  'admin123',
  'admin',
  '+6281234567890',
  true
);

-- Verify it was inserted
SELECT id, name, email, role, is_active, created_at 
FROM users 
WHERE email = 'admin@bnigrow.com';

-- If the above fails with RLS error, disable RLS temporarily:
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- Then run the INSERT again
-- Then re-enable: ALTER TABLE users ENABLE ROW LEVEL SECURITY;
