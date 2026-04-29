-- Remove 19 visitors that were just inserted from Excel (30 April)
-- This will restore the database to previous state

-- Delete visitors inserted today with specific names from Excel
DELETE FROM visitors
WHERE created_at >= NOW() - INTERVAL '24 hours'
AND name IN (
  'Aurelia',
  'Aminullah',
  'Frida',
  'Abram Ardhiya',
  'Meilita Ariyonang',
  'Devi Ayudya',
  'Dwi Dwi',
  'Jefferson Edmund',
  'Alimin Fredy',
  'Gerarld Gautama',
  'Tedi Hamdani',
  'Edy Lim',
  'Surya Nanda',
  'Renni Susanti',
  'Sinda Sutadisastra',
  'Teti Teti'
);

-- Verify deletion
SELECT 
  COUNT(*) as total_visitors,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as new_visitors_today
FROM visitors;

-- Show remaining visitors count by gender
SELECT 
  gender,
  COUNT(*) as count
FROM visitors
GROUP BY gender
ORDER BY count DESC;
