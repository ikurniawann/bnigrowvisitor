-- ============================================
-- MIGRATION: Insert Additional Visitors 11 Juni 2026
-- Only inserts visitors that don't already exist
-- Chapter: Grow
-- ============================================

-- NOTE: Meeting 11 Juni 2026 sudah dibuat di migration 003.
-- Tambahkan kolom gender jika belum ada (aman di-run ulang)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'visitors' AND column_name = 'gender'
    ) THEN
        ALTER TABLE visitors ADD COLUMN gender varchar(10);
        RAISE NOTICE 'Kolom gender ditambahkan';
    END IF;
END $$;

-- Insert only visitors yang belum ada (cek berdasarkan email)
INSERT INTO visitors (name, phone, email, gender, business_field, company, chapter, referral_name, status, meeting_id, created_at)

-- 1. Kassandra Hagaina Ginting
SELECT 'Kassandra Hagaina Ginting', '6281264242382', 'latersiaflorist@gmail.com', 'Ibu', 'Retail', 'CV Latersia Jaya Abadi', 'Grow', 'Kezia Hairun Nisa', 'new', m.id, NOW()
FROM meetings m WHERE m.meeting_date = '2026-06-11'
AND NOT EXISTS (SELECT 1 FROM visitors v WHERE v.email = 'latersiaflorist@gmail.com')
LIMIT 1;

-- 2. Hartono Hartono
INSERT INTO visitors (name, phone, email, gender, business_field, company, chapter, referral_name, status, meeting_id, created_at)
SELECT 'Hartono Hartono', '6281299137588', 'Hq.agungtranssolusindo@gmail.com', 'Bapak', 'Legal & Accounting', 'Agung trans solusindo', 'Grow', 'Widjanarka Budhihardjo', 'new', m.id, NOW()
FROM meetings m WHERE m.meeting_date = '2026-06-11'
AND NOT EXISTS (SELECT 1 FROM visitors v WHERE v.email = 'Hq.agungtranssolusindo@gmail.com')
LIMIT 1;

-- 3. Leka Putra
INSERT INTO visitors (name, phone, email, gender, business_field, company, chapter, referral_name, status, meeting_id, created_at)
SELECT 'Leka Putra', '628125790531', 'leka.putra@yahoo.com', '', 'Art & Entertainment', 'Painted by Leka Putra', 'Grow', 'Bonaventura', 'new', m.id, NOW()
FROM meetings m WHERE m.meeting_date = '2026-06-11'
AND NOT EXISTS (SELECT 1 FROM visitors v WHERE v.email = 'leka.putra@yahoo.com')
LIMIT 1;

-- Verifikasi total visitor meeting 11 Juni 2026
SELECT 
    m.meeting_date,
    m.title,
    COUNT(v.id) as total_visitors
FROM meetings m
LEFT JOIN visitors v ON v.meeting_id = m.id AND v.status = 'new'
WHERE m.meeting_date = '2026-06-11'
GROUP BY m.id, m.meeting_date, m.title;
