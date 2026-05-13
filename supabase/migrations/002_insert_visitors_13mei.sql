-- ============================================
-- MIGRATION: Insert Visitors 13 Mei 2026
-- Chapter: Grow
-- Meeting: Kamis, 14 Mei 2026 (Online)
-- ============================================

-- Cek apakah meeting 14 Mei 2026 sudah ada, jika belum buat dulu
DO $$
DECLARE
    meeting_id uuid;
    v_visitor RECORD;
BEGIN
    -- Cari atau buat meeting untuk 14 Mei 2026
    SELECT id INTO meeting_id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1;
    
    IF meeting_id IS NULL THEN
        INSERT INTO meetings (title, meeting_date, location, notes, created_by)
        VALUES (
            'Weekly Meeting 14 Mei 2026',
            '2026-05-14',
            'Online',
            'Meeting online via Zoom/Google Meet',
            (SELECT id FROM users WHERE email = 'admin@bnigrow.com' LIMIT 1)
        )
        RETURNING id INTO meeting_id;
        
        RAISE NOTICE 'Meeting 14 Mei 2026 dibuat dengan ID: %', meeting_id;
    ELSE
        RAISE NOTICE 'Meeting 14 Mei 2026 sudah ada dengan ID: %', meeting_id;
    END IF;

    -- Insert visitor data
    -- Note: Menggunakan INSERT tanpa meeting_id terlebih dahulu untuk menghindari constraint issues
    
    -- Visitor 1
    INSERT INTO visitors (name, phone, email, business_field, company, chapter, referral_name, status, created_at)
    VALUES ('suwarno', '6281317113088', 'suwarno82@gmail.com', 'Manufacturing', 'www.mitraalatternak.com', 'Grow', 'Maria Soerjanti', 'new', NOW())
    ON CONFLICT (phone) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        business_field = EXCLUDED.business_field,
        company = EXCLUDED.company,
        chapter = EXCLUDED.chapter,
        referral_name = EXCLUDED.referral_name,
        updated_at = NOW();

    -- Visitor 2
    INSERT INTO visitors (name, phone, email, business_field, company, chapter, referral_name, status, created_at)
    VALUES ('Frida', '081291999908', 'Frida_piggy@yahoo.com', 'Retail', 'Best Indonesia Gift', 'Grow', 'Anna Meilanny', 'new', NOW())
    ON CONFLICT (phone) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        business_field = EXCLUDED.business_field,
        company = EXCLUDED.company,
        chapter = EXCLUDED.chapter,
        referral_name = EXCLUDED.referral_name,
        updated_at = NOW();

    -- Visitor 3
    INSERT INTO visitors (name, phone, email, business_field, company, chapter, referral_name, status, created_at)
    VALUES ('Joseph Ananto', '+628111812313', 'Josephalexander@otoklix.com', 'Car & Motorcycle', 'Otoklix', 'Grow', 'Selviya Debora', 'new', NOW())
    ON CONFLICT (phone) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        business_field = EXCLUDED.business_field,
        company = EXCLUDED.company,
        chapter = EXCLUDED.chapter,
        referral_name = EXCLUDED.referral_name,
        updated_at = NOW();

    -- Visitor 4
    INSERT INTO visitors (name, phone, email, business_field, company, chapter, referral_name, status, created_at)
    VALUES ('Elysabet Bong', '08129417963', 'elysabet.bong@gmail.com', 'Computer & Programming', NULL, 'Grow', 'Davy Satria', 'new', NOW())
    ON CONFLICT (phone) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        business_field = EXCLUDED.business_field,
        company = EXCLUDED.company,
        chapter = EXCLUDED.chapter,
        referral_name = EXCLUDED.referral_name,
        updated_at = NOW();

    -- Visitor 5
    INSERT INTO visitors (name, phone, email, business_field, company, chapter, referral_name, status, created_at)
    VALUES ('Jeani Charolina Bukit', '082133317200', 'jeanybukit@gmail.com', 'Art & Entertainment', 'Flowersbyjeany', 'Grow', 'Hastomo Wijoyo', 'new', NOW())
    ON CONFLICT (phone) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        business_field = EXCLUDED.business_field,
        company = EXCLUDED.company,
        chapter = EXCLUDED.chapter,
        referral_name = EXCLUDED.referral_name,
        updated_at = NOW();

    -- Visitor 6
    INSERT INTO visitors (name, phone, email, business_field, company, chapter, referral_name, status, created_at)
    VALUES ('Ivan Armatias Herianto', '08111405995', 'ivan.herianto@masterista.com', 'Manufacturing', 'Masterista Foodservice Solution', 'Grow', 'Anna Meilanny', 'new', NOW())
    ON CONFLICT (phone) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        business_field = EXCLUDED.business_field,
        company = EXCLUDED.company,
        chapter = EXCLUDED.chapter,
        referral_name = EXCLUDED.referral_name,
        updated_at = NOW();

    -- Visitor 7
    INSERT INTO visitors (name, phone, email, business_field, company, chapter, referral_name, status, created_at)
    VALUES ('Recardo Leatemia', '08161990815', 'recardo.leatemia@gmail.com', 'Retail', 'Introvert', 'Grow', 'Eka Sudjana', 'new', NOW())
    ON CONFLICT (phone) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        business_field = EXCLUDED.business_field,
        company = EXCLUDED.company,
        chapter = EXCLUDED.chapter,
        referral_name = EXCLUDED.referral_name,
        updated_at = NOW();

    -- Visitor 8
    INSERT INTO visitors (name, phone, email, business_field, company, chapter, referral_name, status, created_at)
    VALUES ('Mikhael Martin', '085895123450', 'Mikhael.martin@gmail.com', 'Advertising & Marketing', 'Play Castle Studio', 'Grow', 'Erdy Suryadarma', 'new', NOW())
    ON CONFLICT (phone) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        business_field = EXCLUDED.business_field,
        company = EXCLUDED.company,
        chapter = EXCLUDED.chapter,
        referral_name = EXCLUDED.referral_name,
        updated_at = NOW();

    -- Visitor 9
    INSERT INTO visitors (name, phone, email, business_field, company, chapter, referral_name, status, created_at)
    VALUES ('Diva Melati sukma', '081572559131', 'rumahsandalgeulis19@gmail.com', 'Manufacturing', 'Rumah sandal geulis', 'Grow', 'Riene Mahardiani', 'new', NOW())
    ON CONFLICT (phone) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        business_field = EXCLUDED.business_field,
        company = EXCLUDED.company,
        chapter = EXCLUDED.chapter,
        referral_name = EXCLUDED.referral_name,
        updated_at = NOW();

    -- Visitor 10
    INSERT INTO visitors (name, phone, email, business_field, company, chapter, referral_name, status, created_at)
    VALUES ('Mercy Michellia', '08111344373', 'merc.michellia@gmail.com', 'Finance & Insurance', 'Finance', 'Grow', 'Mas Agung Sachli', 'new', NOW())
    ON CONFLICT (phone) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        business_field = EXCLUDED.business_field,
        company = EXCLUDED.company,
        chapter = EXCLUDED.chapter,
        referral_name = EXCLUDED.referral_name,
        updated_at = NOW();

    -- Visitor 11
    INSERT INTO visitors (name, phone, email, business_field, company, chapter, referral_name, status, created_at)
    VALUES ('Aldi Rahadiansyah', '081311827846', 'aldirhzl7@gmail.com', 'Food & Beverage', 'Aldi Store', 'Grow', 'Achmad Faizal', 'new', NOW())
    ON CONFLICT (phone) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        business_field = EXCLUDED.business_field,
        company = EXCLUDED.company,
        chapter = EXCLUDED.chapter,
        referral_name = EXCLUDED.referral_name,
        updated_at = NOW();

    -- Visitor 12
    INSERT INTO visitors (name, phone, email, business_field, company, chapter, referral_name, status, created_at)
    VALUES ('Ardian Rangga', '081298319944', 'ardianrangga@gmail.com', 'Training & Coaching', 'PT. Byuara solusi indonesia', 'Grow', 'Hastomo Wijoyo', 'new', NOW())
    ON CONFLICT (phone) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        business_field = EXCLUDED.business_field,
        company = EXCLUDED.company,
        chapter = EXCLUDED.chapter,
        referral_name = EXCLUDED.referral_name,
        updated_at = NOW();

    -- Visitor 13
    INSERT INTO visitors (name, phone, email, business_field, company, chapter, referral_name, status, created_at)
    VALUES ('Rosdiana Sary Siregar', '+6282120285007', 'rosdiana@ciptamultimegaayra.co.id', 'Event & Business Service', 'PT. Cipta Multimega Arya', 'Grow', 'Dedy Dahlan', 'new', NOW())
    ON CONFLICT (phone) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        business_field = EXCLUDED.business_field,
        company = EXCLUDED.company,
        chapter = EXCLUDED.chapter,
        referral_name = EXCLUDED.referral_name,
        updated_at = NOW();

    -- Visitor 14
    INSERT INTO visitors (name, phone, email, business_field, company, chapter, referral_name, status, created_at)
    VALUES ('Justin Siswanto', '+62 811-8800-573', 'justinsiswanto6@gmail.com', 'Manufacturing', 'PT Sinar Mas Agro Resource & Technology', 'Grow', 'Lurus Ledyati', 'new', NOW())
    ON CONFLICT (phone) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        business_field = EXCLUDED.business_field,
        company = EXCLUDED.company,
        chapter = EXCLUDED.chapter,
        referral_name = EXCLUDED.referral_name,
        updated_at = NOW();

    -- Visitor 15
    INSERT INTO visitors (name, phone, email, business_field, company, chapter, referral_name, status, created_at)
    VALUES ('Dedi Suhendi', '08157110051', 'eo.alaminspirasi@gmail.com', 'Event & Business Service', 'PT. Kreasi Alam Inspirasi', 'Grow', 'Hastomo Wijoyo', 'new', NOW())
    ON CONFLICT (phone) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        business_field = EXCLUDED.business_field,
        company = EXCLUDED.company,
        chapter = EXCLUDED.chapter,
        referral_name = EXCLUDED.referral_name,
        updated_at = NOW();

    -- Visitor 16
    INSERT INTO visitors (name, phone, email, business_field, company, chapter, referral_name, status, created_at)
    VALUES ('Dendin Syihab', '081220154433', 'dendinsyihab78@gmail.com', 'Computer & Programming', 'Gading net', 'Grow', 'Herwin Muchtar', 'new', NOW())
    ON CONFLICT (phone) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        business_field = EXCLUDED.business_field,
        company = EXCLUDED.company,
        chapter = EXCLUDED.chapter,
        referral_name = EXCLUDED.referral_name,
        updated_at = NOW();

    -- Update meeting_id untuk semua visitor Grow yang baru saja diinsert
    UPDATE visitors 
    SET meeting_id = meeting_id
    WHERE chapter = 'Grow' 
    AND created_at >= CURRENT_DATE 
    AND meeting_id IS NULL;

    RAISE NOTICE '✅ Berhasil memasukkan/update 16 visitor untuk meeting 14 Mei 2026';

END $$;

-- Verifikasi hasil
SELECT 
    COUNT(*) as total_visitor,
    chapter,
    status
FROM visitors 
WHERE created_at >= CURRENT_DATE 
GROUP BY chapter, status;
