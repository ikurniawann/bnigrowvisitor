-- ============================================
-- CREATE ADMIN USER - BNI Grow Visitor
-- ============================================
-- Run this in Supabase SQL Editor to create the admin user

-- Insert admin user (simple password check for development)
INSERT INTO users (id, name, email, password_hash, role, phone, is_active, created_at, updated_at) 
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Admin BNI Grow',
  'admin@bnigrow.com',
  'admin123',
  'admin',
  '+6281234567890',
  true,
  now(),
  now()
)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  is_active = EXCLUDED.is_active,
  password_hash = EXCLUDED.password_hash;

-- Verify user was created
SELECT id, name, email, role, phone, is_active 
FROM users 
WHERE email = 'admin@bnigrow.com';
