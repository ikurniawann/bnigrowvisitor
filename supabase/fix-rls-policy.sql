-- ============================================
-- FIX RLS POLICIES - BNI Grow Visitor
-- ============================================
-- Run this in Supabase SQL Editor to fix insert/update/delete permissions

-- Disable RLS temporarily for testing (OPTIONAL - use with caution)
-- ALTER TABLE visitors DISABLE ROW LEVEL SECURITY;

-- Fix: Allow authenticated users to INSERT visitors
DROP POLICY IF EXISTS "Admin/PIC can manage visitors" ON visitors;

CREATE POLICY "Authenticated users can insert visitors"
  ON visitors FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update visitors"
  ON visitors FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete visitors"
  ON visitors FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can select visitors"
  ON visitors FOR SELECT
  TO authenticated
  USING (true);

-- Also fix other tables
DROP POLICY IF EXISTS "Admin/PIC can manage meetings" ON meetings;
DROP POLICY IF EXISTS "Authenticated users can view meetings" ON meetings;

CREATE POLICY "Authenticated users can manage meetings"
  ON meetings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can select meetings"
  ON meetings FOR SELECT
  TO authenticated
  USING (true);

-- Fix users table policies
DROP POLICY IF EXISTS "Users can view all active users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "Allow authenticated users to view users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update users"
  ON users FOR UPDATE
  TO authenticated
  USING (true);

-- Fix visitor_history policies
DROP POLICY IF EXISTS "Authenticated users can view visitor history" ON visitor_history;
DROP POLICY IF EXISTS "Admin/PIC can insert visitor history" ON visitor_history;

CREATE POLICY "Allow authenticated users to view visitor history"
  ON visitor_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert visitor history"
  ON visitor_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Fix interview_notes policies
DROP POLICY IF EXISTS "Authenticated users can view interview notes" ON interview_notes;
DROP POLICY IF EXISTS "Admin/PIC can manage interview notes" ON interview_notes;

CREATE POLICY "Allow authenticated users to manage interview notes"
  ON interview_notes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Fix ocr_sessions policies
DROP POLICY IF EXISTS "Authenticated users can view OCR sessions" ON ocr_sessions;
DROP POLICY IF EXISTS "Admin/PIC can manage OCR sessions" ON ocr_sessions;

CREATE POLICY "Allow authenticated users to manage OCR sessions"
  ON ocr_sessions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Verify policies
SELECT tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
