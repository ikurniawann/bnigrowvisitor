-- Cek apakah ada error/duplicate saat insert
-- Lihat visitor yang berhasil diinsert hari ini
SELECT 
    name,
    phone,
    email,
    company,
    referral_name,
    meeting_id,
    created_at
FROM visitors 
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY name;

-- Cek total visitor per meeting tanggal 14 Mei
SELECT 
    m.meeting_date,
    COUNT(v.id) as total_visitor
FROM meetings m
LEFT JOIN visitors v ON v.meeting_id = m.id
WHERE m.meeting_date = '2026-05-14'
GROUP BY m.id, m.meeting_date;

-- Cek visitor yang gagal diinsert (kalau ada error log)
-- Atau cek apakah ada phone yang sudah ada sebelumnya
SELECT 
    v.name,
    v.phone,
    v.created_at
FROM visitors v
WHERE v.phone IN (
    '6281317113088',
    '081291999908',
    '+628111812313',
    '08129417963',
    '082133317200',
    '08111405995',
    '08161990815',
    '085895123450',
    '081572559131',
    '08111344373',
    '081311827846',
    '081298319944',
    '+6282120285007',
    '+62 811-8800-573',
    '08157110051',
    '081220154433'
)
ORDER BY v.created_at DESC;
