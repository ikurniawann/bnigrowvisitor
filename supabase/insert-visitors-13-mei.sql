-- ============================================
-- INSERT VISITORS - 13 Mei 2026
-- Meeting: Kamis, 14 Mei 2026 (Online)
-- Chapter: Grow
-- ============================================

-- Insert visitors untuk meeting 14 Mei 2026
-- Semua meeting format: Online

INSERT INTO visitors (name, phone, email, business_field, company, chapter, referral_name, status, created_at) VALUES
('suwarno', '6281317113088', 'suwarno82@gmail.com', 'Manufacturing', 'www.mitraalatternak.com', 'Grow', 'Maria Soerjanti', 'new', NOW()),
('Frida', '081291999908', 'Frida_piggy@yahoo.com', 'Retail', 'Best Indonesia Gift', 'Grow', 'Anna Meilanny', 'new', NOW()),
('Joseph Ananto', '+628111812313', 'Josephalexander@otoklix.com', 'Car & Motorcycle', 'Otoklix', 'Grow', 'Selviya Debora', 'new', NOW()),
('Elysabet Bong', '08129417963', 'elysabet.bong@gmail.com', 'Computer & Programming', NULL, 'Grow', 'Davy Satria', 'new', NOW()),
('Jeani Charolina Bukit', '082133317200', 'jeanybukit@gmail.com', 'Art & Entertainment', 'Flowersbyjeany', 'Grow', 'Hastomo Wijoyo', 'new', NOW()),
('Ivan Armatias Herianto', '08111405995', 'ivan.herianto@masterista.com', 'Manufacturing', 'Masterista Foodservice Solution', 'Grow', 'Anna Meilanny', 'new', NOW()),
('Recardo Leatemia', '08161990815', 'recardo.leatemia@gmail.com', 'Retail', 'Introvert', 'Grow', 'Eka Sudjana', 'new', NOW()),
('Mikhael Martin', '085895123450', 'Mikhael.martin@gmail.com', 'Advertising & Marketing', 'Play Castle Studio', 'Grow', 'Erdy Suryadarma', 'new', NOW()),
('Diva Melati sukma', '081572559131', 'rumahsandalgeulis19@gmail.com', 'Manufacturing', 'Rumah sandal geulis', 'Grow', 'Riene Mahardiani', 'new', NOW()),
('Mercy Michellia', '08111344373', 'merc.michellia@gmail.com', 'Finance & Insurance', 'Finance', 'Grow', 'Mas Agung Sachli', 'new', NOW()),
('Aldi Rahadiansyah', '081311827846', 'aldirhzl7@gmail.com', 'Food & Beverage', 'Aldi Store', 'Grow', 'Achmad Faizal', 'new', NOW()),
('Ardian Rangga', '081298319944', 'ardianrangga@gmail.com', 'Training & Coaching', 'PT. Byuara solusi indonesia', 'Grow', 'Hastomo Wijoyo', 'new', NOW()),
('Rosdiana Sary Siregar', '+6282120285007', 'rosdiana@ciptamultimegaayra.co.id', 'Event & Business Service', 'PT. Cipta Multimega Arya', 'Grow', 'Dedy Dahlan', 'new', NOW()),
('Justin Siswanto', '+62 811-8800-573', 'justinsiswanto6@gmail.com', 'Manufacturing', 'PT Sinar Mas Agro Resource & Technology', 'Grow', 'Lurus Ledyati', 'new', NOW()),
('Dedi Suhendi', '08157110051', 'eo.alaminspirasi@gmail.com', 'Event & Business Service', 'PT. Kreasi Alam Inspirasi', 'Grow', 'Hastomo Wijoyo', 'new', NOW()),
('Dendin Syihab', '081220154433', 'dendinsyihab78@gmail.com', 'Computer & Programming', 'Gading net', 'Grow', 'Herwin Muchtar', 'new', NOW());

-- Update meeting_id untuk visitor yang sudah ada jika meeting 14 Mei sudah tersedia
-- (Biasanya di-import setelah meeting dibuat)
-- UPDATE visitors SET meeting_id = (SELECT id FROM meetings WHERE meeting_date = '2026-05-14' LIMIT 1) 
-- WHERE created_at >= CURRENT_DATE AND chapter = 'Grow';
