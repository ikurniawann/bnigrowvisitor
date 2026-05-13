const { createClient } = require('@supabase/supabase-js');

// Konfigurasi Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus di-set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Data visitor dari CSV 13 Mei 2026
// Meeting: Kamis, 14 Mei 2026 - Online
const visitors = [
  { name: 'suwarno', phone: '6281317113088', email: 'suwarno82@gmail.com', business_field: 'Manufacturing', company: 'www.mitraalatternak.com', chapter: 'Grow', referral_name: 'Maria Soerjanti' },
  { name: 'Frida', phone: '081291999908', email: 'Frida_piggy@yahoo.com', business_field: 'Retail', company: 'Best Indonesia Gift', chapter: 'Grow', referral_name: 'Anna Meilanny' },
  { name: 'Joseph Ananto', phone: '+628111812313', email: 'Josephalexander@otoklix.com', business_field: 'Car & Motorcycle', company: 'Otoklix', chapter: 'Grow', referral_name: 'Selviya Debora' },
  { name: 'Elysabet Bong', phone: '08129417963', email: 'elysabet.bong@gmail.com', business_field: 'Computer & Programming', company: null, chapter: 'Grow', referral_name: 'Davy Satria' },
  { name: 'Jeani Charolina Bukit', phone: '082133317200', email: 'jeanybukit@gmail.com', business_field: 'Art & Entertainment', company: 'Flowersbyjeany', chapter: 'Grow', referral_name: 'Hastomo Wijoyo' },
  { name: 'Ivan Armatias Herianto', phone: '08111405995', email: 'ivan.herianto@masterista.com', business_field: 'Manufacturing', company: 'Masterista Foodservice Solution', chapter: 'Grow', referral_name: 'Anna Meilanny' },
  { name: 'Recardo Leatemia', phone: '08161990815', email: 'recardo.leatemia@gmail.com', business_field: 'Retail', company: 'Introvert', chapter: 'Grow', referral_name: 'Eka Sudjana' },
  { name: 'Mikhael Martin', phone: '085895123450', email: 'Mikhael.martin@gmail.com', business_field: 'Advertising & Marketing', company: 'Play Castle Studio', chapter: 'Grow', referral_name: 'Erdy Suryadarma' },
  { name: 'Diva Melati sukma', phone: '081572559131', email: 'rumahsandalgeulis19@gmail.com', business_field: 'Manufacturing', company: 'Rumah sandal geulis', chapter: 'Grow', referral_name: 'Riene Mahardiani' },
  { name: 'Mercy Michellia', phone: '08111344373', email: 'merc.michellia@gmail.com', business_field: 'Finance & Insurance', company: 'Finance', chapter: 'Grow', referral_name: 'Mas Agung Sachli' },
  { name: 'Aldi Rahadiansyah', phone: '081311827846', email: 'aldirhzl7@gmail.com', business_field: 'Food & Beverage', company: 'Aldi Store', chapter: 'Grow', referral_name: 'Achmad Faizal' },
  { name: 'Ardian Rangga', phone: '081298319944', email: 'ardianrangga@gmail.com', business_field: 'Training & Coaching', company: 'PT. Byuara solusi indonesia', chapter: 'Grow', referral_name: 'Hastomo Wijoyo' },
  { name: 'Rosdiana Sary Siregar', phone: '+6282120285007', email: 'rosdiana@ciptamultimegaayra.co.id', business_field: 'Event & Business Service', company: 'PT. Cipta Multimega Arya', chapter: 'Grow', referral_name: 'Dedy Dahlan' },
  { name: 'Justin Siswanto', phone: '+62 811-8800-573', email: 'justinsiswanto6@gmail.com', business_field: 'Manufacturing', company: 'PT Sinar Mas Agro Resource & Technology', chapter: 'Grow', referral_name: 'Lurus Ledyati' },
  { name: 'Dedi Suhendi', phone: '08157110051', email: 'eo.alaminspirasi@gmail.com', business_field: 'Event & Business Service', company: 'PT. Kreasi Alam Inspirasi', chapter: 'Grow', referral_name: 'Hastomo Wijoyo' },
  { name: 'Dendin Syihab', phone: '081220154433', email: 'dendinsyihab78@gmail.com', business_field: 'Computer & Programming', company: 'Gading net', chapter: 'Grow', referral_name: 'Herwin Muchtar' },
];

async function insertVisitors() {
  console.log(`Memasukkan ${visitors.length} visitor ke database...`);
  
  // Batch insert
  const { data, error } = await supabase
    .from('visitors')
    .insert(visitors)
    .select();

  if (error) {
    console.error('Error saat insert:', error);
    process.exit(1);
  }

  console.log(`✅ Berhasil memasukkan ${data.length} visitor!`);
  
  // Update meeting_id jika meeting 14 Mei 2026 sudah ada
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('id')
    .eq('meeting_date', '2026-05-14')
    .single();

  if (meetingError) {
    console.log('ℹ️ Meeting 14 Mei 2026 belum dibuat, visitor tidak di-link ke meeting');
    console.log('   Silakan buat meeting terlebih dahulu di dashboard');
  } else {
    // Update meeting_id untuk visitor yang baru saja diinsert
    const visitorIds = data.map(v => v.id);
    const { error: updateError } = await supabase
      .from('visitors')
      .update({ meeting_id: meeting.id })
      .in('id', visitorIds);

    if (updateError) {
      console.error('Error saat update meeting_id:', updateError);
    } else {
      console.log(`✅ Linked ${visitorIds.length} visitor ke meeting 14 Mei 2026`);
    }
  }
}

insertVisitors();
