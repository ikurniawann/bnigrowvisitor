-- Cek total visitor untuk meeting 14 Mei 2026
SELECT 
    m.meeting_date,
    m.title,
    COUNT(v.id) as total_visitor
FROM meetings m
LEFT JOIN visitors v ON v.meeting_id = m.id
WHERE m.meeting_date = '2026-05-14'
GROUP BY m.id, m.meeting_date, m.title;

-- Detail visitor untuk meeting 14 Mei
SELECT 
    v.name,
    v.phone,
    v.email,
    v.business_field,
    v.company,
    v.referral_name,
    v.referred_by_member_id,
    u.name as member_name
FROM visitors v
LEFT JOIN meetings m ON m.id = v.meeting_id
LEFT JOIN users u ON u.id = v.referred_by_member_id
WHERE m.meeting_date = '2026-05-14'
ORDER BY v.name;

-- Cek apakah ada duplicate phone
SELECT phone, COUNT(*) as count
FROM visitors
WHERE meeting_id IN (SELECT id FROM meetings WHERE meeting_date = '2026-05-14')
GROUP BY phone
HAVING COUNT(*) > 1;
