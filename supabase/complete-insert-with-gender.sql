-- Complete script: Add gender column + Insert 19 visitors
-- Run this once in Supabase SQL Editor

-- Step 1: Add gender column
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'Bapak';

CREATE INDEX IF NOT EXISTS idx_visitors_gender ON visitors(gender);

-- Step 2: Insert 19 visitors with gender
INSERT INTO visitors (name, phone, email, company, business_field, chapter, gender, meeting_date, status, notes) VALUES
('Aurelia', '08995844575', 'aurelia.anindita@kobe.co.id', 'PT Kobe Boga Utama', 'Manufacturing - Food Products', '', 'Ibu', '2026-04-29', 'new', ''),
('Aminullah', '085717185615', 'aminullahami01@gmail.com', 'Coco mandar', 'Agriculture - Agriculture (Other)', '', 'Bapak', '2026-04-29', 'new', ''),
('Frida', '081291999908', 'Frida_piggy@yahoo.com', 'Best Indonesia Gift', 'Retail - Gifts', '', 'Ibu', '2026-04-29', 'new', ''),
('Abram Ardhiya', '087771672002', 'abram@videfly.com', 'PT Teknologi Terbang Tinggi', 'Advertising & Marketing - AI Consultant', '', 'Bapak', '2026-04-29', 'new', ''),
('Meilita Ariyonang', '081617493393', 'Optickel@gmail.com', 'Optickel', 'Retail - Optical Products', '', 'Ibu', '2026-04-29', 'new', ''),
('Devi Ayudya', '+6281313037420', 'ayudya.devi0@gmail.com', 'Deobia by DNA', 'Retail - Women Apparel', '', 'Ibu', '2026-04-29', 'new', ''),
('Dwi Dwi', '0878-8572-3011', 'Dwi@gmail.com', 'HR Consultant', 'Manufacturing - Electric Energy Generation', '', 'Ibu', '2026-04-29', 'new', ''),
('Jefferson Edmund', '089680949030', 'Jeff@edahaus.com', 'EDAHaus', 'Architecture & Engineering - Architect - Commercial', '', 'Bapak', '2026-04-29', 'new', ''),
('Alimin Fredy', '0813-1033-9788', 'emachindotech@gmail.com', 'PT. Emachindo Teknik Perkasa', 'Advertising & Marketing - Sales Promotion', '', 'Bapak', '2026-04-29', 'new', ''),
('Gerarld Gautama', '+6287888263854', 'ggnj2003@gmail.com', 'PT Fajami Sejahtera Agung', 'Manufacturing - Machinery & Equipment Manufacture', '', 'Bapak', '2026-04-29', 'new', ''),
('Tedi Hamdani', '08551231008', 'sales@kayo.co.id', 'Gpsboss', 'Car & Motorcycle - GPS/Sat Nav Systems', '', 'Bapak', '2026-04-29', 'new', ''),
('Edy Lim', '08119770235', 'Edylim312@gmail.com', 'Prisma Bangun Lestari', 'Architecture & Engineering - Architect', '', 'Bapak', '2026-04-29', 'new', ''),
('Surya Nanda', '081333555000', 'Suryananda@gmail.com', 'Prudential', 'Finance & Insurance - Financial  Advisor', '', 'Bapak', '2026-04-29', 'new', ''),
('Renni Susanti', '081312116999', 'renni@terranovawicker.com', 'Terranovawicker', 'Manufacturing - Furniture manufacture', '', 'Ibu', '2026-04-29', 'new', ''),
('Sinda Sutadisastra', '081212444454', 'crissinda@yahoo.com', '', 'Food & Beverage - Food & Beverage (Other)', '', 'Ibu', '2026-04-29', 'new', ''),
('Teti Teti', '081385575625', 'kwpfinance88@gmail.com', '', 'Manufacturing - Chemical Products', '', 'Ibu', '2026-04-29', 'new', '');

-- Step 3: Verify results
SELECT 
  gender,
  COUNT(*) as total,
  STRING_AGG(LEFT(name, 20), ', ' ORDER BY name) as sample_names
FROM visitors
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY gender
ORDER BY total DESC;

-- Show all newly inserted visitors
SELECT name, gender, company, phone FROM visitors 
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY gender, name;
