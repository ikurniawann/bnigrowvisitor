-- ============================================
-- MIGRATION: Insert Visitors 11 Juni 2026
-- Chapter: Grow
-- Meeting: Kamis, 11 Juni 2026 (Online)
-- ============================================

-- Tambah kolom gender jika belum ada
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

-- Cek apakah meeting 11 Juni 2026 sudah ada, jika belum buat dulu
DO $$
DECLARE
    v_meeting_id uuid;
BEGIN
    SELECT id INTO v_meeting_id FROM meetings WHERE meeting_date = '2026-06-11' LIMIT 1;
    
    IF v_meeting_id IS NULL THEN
        INSERT INTO meetings (title, meeting_date, location, notes, created_by)
        VALUES (
            'Weekly Meeting 11 Juni 2026',
            '2026-06-11',
            'Online',
            'Meeting online via Zoom/Google Meet',
            (SELECT id FROM users WHERE email = 'admin@bnigrow.com' LIMIT 1)
        )
        RETURNING id INTO v_meeting_id;
        
        RAISE NOTICE 'Meeting 11 Juni 2026 dibuat dengan ID: %', v_meeting_id;
    ELSE
        RAISE NOTICE 'Meeting 11 Juni 2026 sudah ada dengan ID: %', v_meeting_id;
    END IF;
END $$;

-- Insert visitor data (cara lama, tanpa ON CONFLICT)
INSERT INTO visitors (name, phone, email, gender, business_field, company, chapter, referral_name, status, meeting_id, created_at)
VALUES 
('Reza Andrianto muhammad', '6287879202444', 'mrezaandri@gmail.com', 'Bapak', 'Real estate services', 'PT wandrijaya', 'Grow', 'Soultan Nur Muhammad', 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-06-11' LIMIT 1), NOW()),
('Eka Arli Chandra', '628129027008', 'eka.arli@aditya.co.id', 'Bapak', 'Retail', 'PT Aditya Sarana Graha', 'Grow', 'Stefanus Prayitno', 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-06-11' LIMIT 1), NOW()),
('Yana Daniswara', '6285353722769', 'april09jasmin@gmail.com', 'Ibu', 'Construction', 'Daniswara', 'Grow', 'John Alan', 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-06-11' LIMIT 1), NOW()),
('Debby Debby', '6281394309191', 'debby_bandung@yahoo.co.id', 'Ibu', 'Health & Wellness', 'CV. Anugrah Besar Abadi', 'Grow', 'Agnes Kristanty', 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-06-11' LIMIT 1), NOW()),
('Tommy Halim', '628118771802', 'singasaktifurnindo@gmail.com', 'Bapak', 'Advertising & Marketing', 'Toko Singapura', 'Grow', 'Adrian Winata', 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-06-11' LIMIT 1), NOW()),
('Anna Hourriere', '6282123032354', 'miloujakarta@gmail.com', 'Ibu', 'Retail', 'Milou', 'Grow', 'Anna Meilanny', 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-06-11' LIMIT 1), NOW()),
('Engelhart Manumpil', '6281310838888', 'Engel.manumpil@gmail.com', 'Bapak', 'Construction', 'Wallpaper supplier', 'Grow', 'John Alan', 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-06-11' LIMIT 1), NOW()),
('Johny Santoso', '62811960780', 'johny.santoso@gmail.com', 'Bapak', 'Construction', 'PT Inutec Surya Indonesia', 'Grow', 'Maria Soerjanti', 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-06-11' LIMIT 1), NOW()),
('Veranica Widjaja', '6281288226706', 'veranica.widjaja@cimbniaga.co.id', 'Ibu', 'Finance & Insurance', 'CiMB niaga', 'Grow', 'Febri Lovitasari', 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-06-11' LIMIT 1), NOW());

-- Verifikasi hasil
SELECT 
    COUNT(*) as total_visitor,
    chapter,
    status
FROM visitors 
WHERE created_at >= CURRENT_DATE 
GROUP BY chapter, status;

-- Detail visitor yang diinsert
SELECT 
    name,
    phone,
    email,
    gender,
    company,
    referral_name,
    meeting_id
FROM visitors 
WHERE created_at >= CURRENT_DATE 
ORDER BY name;
