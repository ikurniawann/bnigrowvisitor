-- ============================================
-- MIGRATION: Insert Visitors 13 Mei 2026
-- Chapter: Grow
-- Meeting: Kamis, 14 Mei 2026 (Online)
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

-- Cek apakah meeting 14 Mei 2026 sudah ada, jika belum buat dulu
DO $$
DECLARE
    v_meeting_id uuid;
BEGIN
    SELECT id INTO v_meeting_id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1;
    
    IF v_meeting_id IS NULL THEN
        INSERT INTO meetings (title, meeting_date, location, notes, created_by)
        VALUES (
            'Weekly Meeting 14 Mei 2026',
            '2026-05-14',
            'Online',
            'Meeting online via Zoom/Google Meet',
            (SELECT id FROM users WHERE email = 'admin@bnigrow.com' LIMIT 1)
        )
        RETURNING id INTO v_meeting_id;
        
        RAISE NOTICE 'Meeting 14 Mei 2026 dibuat dengan ID: %', v_meeting_id;
    ELSE
        RAISE NOTICE 'Meeting 14 Mei 2026 sudah ada dengan ID: %', v_meeting_id;
    END IF;
END $$;

-- Insert visitor data dengan referral_name (teks bebas untuk Diajak Oleh)
INSERT INTO visitors (name, phone, email, gender, business_field, company, chapter, referral_name, status, meeting_id, created_at)
VALUES 
('suwarno', '6281317113088', 'suwarno82@gmail.com', 'Bapak', 'Manufacturing', 'www.mitraalatternak.com', 'Grow', 'Maria Soerjanti', 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Frida', '081291999908', 'Frida_piggy@yahoo.com', 'Ibu', 'Retail', 'Best Indonesia Gift', 'Grow', 'Anna Meilanny', 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Joseph Ananto', '+628111812313', 'Josephalexander@otoklix.com', 'Bapak', 'Car & Motorcycle', 'Otoklix', 'Grow', 'Selviya Debora', 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Elysabet Bong', '08129417963', 'elysabet.bong@gmail.com', 'Ibu', 'Computer & Programming', NULL, 'Grow', 'Davy Satria', 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Jeani Charolina Bukit', '082133317200', 'jeanybukit@gmail.com', 'Ibu', 'Art & Entertainment', 'Flowersbyjeany', 'Grow', 'Hastomo Wijoyo', 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Ivan Armatias Herianto', '08111405995', 'ivan.herianto@masterista.com', 'Bapak', 'Manufacturing', 'Masterista Foodservice Solution', 'Grow', 'Anna Meilanny', 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Recardo Leatemia', '08161990815', 'recardo.leatemia@gmail.com', 'Bapak', 'Retail', 'Introvert', 'Grow', 'Eka Sudjana', 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Mikhael Martin', '085895123450', 'Mikhael.martin@gmail.com', 'Bapak', 'Advertising & Marketing', 'Play Castle Studio', 'Grow', 'Erdy Suryadarma', 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Diva Melati sukma', '081572559131', 'rumahsandalgeulis19@gmail.com', 'Ibu', 'Manufacturing', 'Rumah sandal geulis', 'Grow', 'Riene Mahardiani', 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Mercy Michellia', '08111344373', 'merc.michellia@gmail.com', 'Ibu', 'Finance & Insurance', 'Finance', 'Grow', 'Mas Agung Sachli', 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Aldi Rahadiansyah', '081311827846', 'aldirhzl7@gmail.com', 'Bapak', 'Food & Beverage', 'Aldi Store', 'Grow', 'Achmad Faizal', 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Ardian Rangga', '081298319944', 'ardianrangga@gmail.com', 'Bapak', 'Training & Coaching', 'PT. Byuara solusi indonesia', 'Grow', 'Hastomo Wijoyo', 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Rosdiana Sary Siregar', '+6282120285007', 'rosdiana@ciptamultimegaayra.co.id', 'Ibu', 'Event & Business Service', 'PT. Cipta Multimega Arya', 'Grow', 'Dedy Dahlan', 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Justin Siswanto', '+62 811-8800-573', 'justinsiswanto6@gmail.com', 'Bapak', 'Manufacturing', 'PT Sinar Mas Agro Resource & Technology', 'Grow', 'Lurus Ledyati', 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Dedi Suhendi', '08157110051', 'eo.alaminspirasi@gmail.com', 'Bapak', 'Event & Business Service', 'PT. Kreasi Alam Inspirasi', 'Grow', 'Hastomo Wijoyo', 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Dendin Syihab', '081220154433', 'dendinsyihab78@gmail.com', 'Bapak', 'Computer & Programming', 'Gading net', 'Grow', 'Herwin Muchtar', 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW())
ON CONFLICT (phone) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    gender = EXCLUDED.gender,
    business_field = EXCLUDED.business_field,
    company = EXCLUDED.company,
    chapter = EXCLUDED.chapter,
    referral_name = EXCLUDED.referral_name,
    status = EXCLUDED.status,
    meeting_id = EXCLUDED.meeting_id,
    updated_at = NOW();

-- Verifikasi hasil
SELECT 
    COUNT(*) as total_visitor,
    chapter,
    status
FROM visitors 
WHERE created_at >= CURRENT_DATE 
GROUP BY chapter, status;

-- Detail visitor yang diinsert (lihat referral_name)
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
AND chapter = 'Grow'
ORDER BY name;
