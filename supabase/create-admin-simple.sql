-- ============================================
-- CREATE ADMIN - SIMPLE & RELIABLE
-- ============================================
-- Run this in Supabase SQL Editor
-- This will CREATE the admin user if it doesn't exist

-- First, let's check if we can query the table
SELECT 'Table users exists' as status;

-- Insert admin user (will fail if email already exists, that's OK)
INSERT INTO users (name, email, password_hash, role, phone, is_active) 
VALUES (
  'Admin BNI Grow',
  'admin@bnigrow.com',
  'admin123',
  'admin',
  '+6281234567890',
  true
);

-- Check if it worked
SELECT 'User count: ' || COUNT(*) as info FROM users WHERE email = 'admin@bnigrow.com';

-- Show the user
SELECT * FROM users WHERE email = 'admin@bnigrow.com';

-- If you get RLS error, run this first:
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
