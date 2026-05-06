-- Update semua visitor meeting_date jadi 30 April 2026
-- Jalankan di Supabase Dashboard > SQL Editor

UPDATE visitors
SET meeting_date = '2026-04-30'
WHERE meeting_date IS NOT NULL;

-- Cek hasil update
SELECT 
  id,
  name,
  company,
  meeting_date,
  updated_at
FROM visitors
ORDER BY created_at DESC;

-- Count total yang diupdate
SELECT COUNT(*) as total_updated FROM visitors WHERE meeting_date = '2026-04-30';
