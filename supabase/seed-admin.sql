-- ============================================
-- CREATE ADMIN USER - BNI Grow Visitor
-- ============================================
-- Run this in Supabase SQL Editor
-- Password: admin123 (hardcoded in auth.ts for development)

-- Insert admin user
INSERT INTO users (name, email, password_hash, role, phone, is_active) 
VALUES (
  'Admin BNI Grow',
  'admin@bnigrow.com',
  'admin123',
  'admin',
  '+6281234567890',
  true
)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  is_active = EXCLUDED.is_active,
  password_hash = EXCLUDED.password_hash;

-- Verify
SELECT id, name, email, role, phone, is_active FROM users WHERE email = 'admin@bnigrow.com';
