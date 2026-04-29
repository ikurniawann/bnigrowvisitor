-- ============================================
-- SEED DATA - BNI Grow Visitor Management System
-- ============================================

-- Create sample PIC users
INSERT INTO users (name, email, password_hash, role, phone) VALUES
  ('PIC 1', 'pic1@bnigrow.com', '$2b$10$rMx9zKqQ8vL3jN5wY6tH7OZGxK4pW2nR8sT1uV3xY5zA6bC7dE8fG', 'pic', '+6281234567891'),
  ('PIC 2', 'pic2@bnigrow.com', '$2b$10$rMx9zKqQ8vL3jN5wY6tH7OZGxK4pW2nR8sT1uV3xY5zA6bC7dE8fG', 'pic', '+6281234567892'),
  ('PIC 3', 'pic3@bnigrow.com', '$2b$10$rMx9zKqQ8vL3jN5wY6tH7OZGxK4pW2nR8sT1uV3xY5zA6bC7dE8fG', 'pic', '+6281234567893')
ON CONFLICT (email) DO NOTHING;

-- Create sample meeting
INSERT INTO meetings (title, meeting_date, location, notes, created_by) VALUES
  ('Weekly Meeting 28 Apr 2026', '2026-04-28', 'Hotel Grand Kancana, Bekasi', 'Meeting rutin mingguan', 
   (SELECT id FROM users WHERE email = 'admin@bnigrow.com'))
ON CONFLICT DO NOTHING;

-- ============================================
-- DEFAULT PASSWORD FOR ALL USERS
-- Email: [any user email above]
-- Password: admin123
-- ============================================
-- IMPORTANT: Change passwords after first login!
