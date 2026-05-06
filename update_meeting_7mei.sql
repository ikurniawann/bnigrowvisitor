-- Update Dasep Badrusalam dan William Eka ke meeting 7 Mei 2026
-- Jalankan di Supabase Dashboard > SQL Editor

-- Step 1: Cek meeting 7 Mei 2026
SELECT id, title, meeting_date 
FROM meetings 
WHERE meeting_date = '2026-05-07';

-- Step 2: Update visitor Dasep Badrusalam dan William Eka ke meeting 7 Mei 2026
-- Ganti 'MEETING_ID_HERE' dengan ID meeting dari Step 1
UPDATE visitors
SET meeting_id = (SELECT id FROM meetings WHERE meeting_date = '2026-05-07' LIMIT 1)
WHERE name IN ('Dasep Badrusalam', 'William Eka');

-- Step 3: Verifikasi update
SELECT 
  id,
  name,
  company,
  meeting_id,
  (SELECT title FROM meetings WHERE id = visitors.meeting_id) as meeting_title,
  (SELECT meeting_date FROM meetings WHERE id = visitors.meeting_id) as meeting_date,
  updated_at
FROM visitors
WHERE name IN ('Dasep Badrusalam', 'William Eka');
