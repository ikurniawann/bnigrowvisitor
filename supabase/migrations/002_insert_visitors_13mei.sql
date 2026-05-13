-- ============================================
-- MIGRATION: Insert Visitors 13 Mei 2026
-- Chapter: Grow
-- Meeting: Kamis, 14 Mei 2026 (Online)
-- ============================================

-- Tambah kolom referred_by_member_id dan gender jika belum ada
DO $$
BEGIN
    -- Cek dan tambah kolom gender
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'visitors' AND column_name = 'gender'
    ) THEN
        ALTER TABLE visitors ADD COLUMN gender varchar(10);
        RAISE NOTICE 'Kolom gender ditambahkan';
    END IF;

    -- Cek dan tambah kolom referred_by_member_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'visitors' AND column_name = 'referred_by_member_id'
    ) THEN
        ALTER TABLE visitors ADD COLUMN referred_by_member_id uuid REFERENCES users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Kolom referred_by_member_id ditambahkan';
    END IF;

    -- Cek dan tambah kolom attended_choice
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'visitors' AND column_name = 'attended_choice_number'
    ) THEN
        ALTER TABLE visitors ADD COLUMN attended_choice_number integer;
        RAISE NOTICE 'Kolom attended_choice_number ditambahkan';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'visitors' AND column_name = 'attended_choice_note'
    ) THEN
        ALTER TABLE visitors ADD COLUMN attended_choice_note text;
        RAISE NOTICE 'Kolom attended_choice_note ditambahkan';
    END IF;
END $$;

-- Cek apakah meeting 14 Mei 2026 sudah ada, jika belum buat dulu
DO $$
DECLARE
    v_meeting_id uuid;
BEGIN
    -- Cari atau buat meeting untuk 14 Mei 2026
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

-- Insert visitor data dengan gender dan referred_by_member_id
INSERT INTO visitors (name, phone, email, gender, business_field, company, chapter, referred_by_member_id, status, meeting_id, created_at)
VALUES 
('suwarno', '6281317113088', 'suwarno82@gmail.com', 'Bapak', 'Manufacturing', 'www.mitraalatternak.com', 'Grow', NULL, 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Frida', '081291999908', 'Frida_piggy@yahoo.com', 'Ibu', 'Retail', 'Best Indonesia Gift', 'Grow', NULL, 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Joseph Ananto', '+628111812313', 'Josephalexander@otoklix.com', 'Bapak', 'Car & Motorcycle', 'Otoklix', 'Grow', NULL, 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Elysabet Bong', '08129417963', 'elysabet.bong@gmail.com', 'Ibu', 'Computer & Programming', NULL, 'Grow', NULL, 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Jeani Charolina Bukit', '082133317200', 'jeanybukit@gmail.com', 'Ibu', 'Art & Entertainment', 'Flowersbyjeany', 'Grow', NULL, 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Ivan Armatias Herianto', '08111405995', 'ivan.herianto@masterista.com', 'Bapak', 'Manufacturing', 'Masterista Foodservice Solution', 'Grow', NULL, 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Recardo Leatemia', '08161990815', 'recardo.leatemia@gmail.com', 'Bapak', 'Retail', 'Introvert', 'Grow', NULL, 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Mikhael Martin', '085895123450', 'Mikhael.martin@gmail.com', 'Bapak', 'Advertising & Marketing', 'Play Castle Studio', 'Grow', NULL, 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Diva Melati sukma', '081572559131', 'rumahsandalgeulis19@gmail.com', 'Ibu', 'Manufacturing', 'Rumah sandal geulis', 'Grow', NULL, 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Mercy Michellia', '08111344373', 'merc.michellia@gmail.com', 'Ibu', 'Finance & Insurance', 'Finance', 'Grow', NULL, 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Aldi Rahadiansyah', '081311827846', 'aldirhzl7@gmail.com', 'Bapak', 'Food & Beverage', 'Aldi Store', 'Grow', NULL, 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Ardian Rangga', '081298319944', 'ardianrangga@gmail.com', 'Bapak', 'Training & Coaching', 'PT. Byuara solusi indonesia', 'Grow', NULL, 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Rosdiana Sary Siregar', '+6282120285007', 'rosdiana@ciptamultimegaayra.co.id', 'Ibu', 'Event & Business Service', 'PT. Cipta Multimega Arya', 'Grow', NULL, 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Justin Siswanto', '+62 811-8800-573', 'justinsiswanto6@gmail.com', 'Bapak', 'Manufacturing', 'PT Sinar Mas Agro Resource & Technology', 'Grow', NULL, 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Dedi Suhendi', '08157110051', 'eo.alaminspirasi@gmail.com', 'Bapak', 'Event & Business Service', 'PT. Kreasi Alam Inspirasi', 'Grow', NULL, 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW()),
('Dendin Syihab', '081220154433', 'dendinsyihab78@gmail.com', 'Bapak', 'Computer & Programming', 'Gading net', 'Grow', NULL, 'new', (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1), NOW())
ON CONFLICT (phone) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    gender = EXCLUDED.gender,
    business_field = EXCLUDED.business_field,
    company = EXCLUDED.company,
    chapter = EXCLUDED.chapter,
    referred_by_member_id = EXCLUDED.referred_by_member_id,
    status = EXCLUDED.status,
    meeting_id = EXCLUDED.meeting_id,
    updated_at = NOW();

-- Update gender berdasarkan title (Mr./Mrs./Ms./Miss)
UPDATE visitors 
SET gender = CASE 
    WHEN name LIKE 'Mr.%' OR name LIKE 'Mrs.%' THEN 'Bapak'
    WHEN name LIKE 'Ms.%' OR name LIKE 'Miss%' THEN 'Ibu'
    ELSE gender
END
WHERE created_at >= CURRENT_DATE AND gender IS NULL;

-- Verifikasi hasil
SELECT 
    COUNT(*) as total_visitor,
    chapter,
    status,
    COUNT(CASE WHEN gender IS NOT NULL THEN 1 END) as with_gender,
    COUNT(CASE WHEN referred_by_member_id IS NOT NULL THEN 1 END) as with_referrer
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
    referred_by_member_id,
    meeting_id
FROM visitors 
WHERE created_at >= CURRENT_DATE 
AND chapter = 'Grow'
ORDER BY name;
