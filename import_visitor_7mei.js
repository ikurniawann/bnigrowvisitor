const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Data visitor dari Excel (hanya Type = "Visitor")
const visitors = [
  {
    title: 'Mr.',
    first_name: 'Ahmad Zaky Arief',
    last_name: 'Bestary',
    company: 'PT Alkhalid Jaya Megah (JM Travel)',
    business_field: 'Travel',
    phone: '082310572050 atau 08159129029',
    email: 'headoffice@jmtourtravel.com',
    invited_by: 'Mayawati Nurhalim',
    meeting_date: '2026-05-07',
    meeting_format: 'Online'
  },
  {
    title: 'Mr.',
    first_name: 'Aulia',
    last_name: 'Fajar',
    company: 'Pt indotama berkah logistik',
    business_field: 'Transport & Shipping',
    phone: '081317078392',
    email: 'Info.iblexpress@gmail.com',
    invited_by: 'Felix Dharmaputra',
    meeting_date: '2026-05-07',
    meeting_format: 'Online'
  },
  {
    title: 'Mr.',
    first_name: 'Alimin',
    last_name: 'Fredy',
    company: 'PT. Emachindo Teknik Perkasa',
    business_field: 'Advertising & Marketing',
    phone: '0813-1033-9788',
    email: 'emachindotech@gmail.com',
    invited_by: 'Adrian Winata',
    meeting_date: '2026-05-07',
    meeting_format: 'Online'
  },
  {
    title: 'Miss',
    first_name: 'Christhalia',
    last_name: 'Irawan',
    company: '',
    business_field: 'Advertising & Marketing',
    phone: '089650100599',
    email: 'Christhaliaa@yahoo.com',
    invited_by: 'Owen Fernando',
    meeting_date: '2026-05-07',
    meeting_format: 'Online'
  },
  {
    title: 'Mr.',
    first_name: 'Rudy',
    last_name: 'Kurniawan',
    company: 'Hubaku',
    business_field: 'Advertising & Marketing',
    phone: '+6586667083',
    email: 'rudy@hubaku.com',
    invited_by: 'Albert Sebastian Rumawas',
    meeting_date: '2026-05-07',
    meeting_format: 'Online'
  },
  {
    title: 'Mr.',
    first_name: 'Yohannes',
    last_name: 'Noercahya',
    company: 'PT Jala Lintas Media',
    business_field: 'Computer & Programming',
    phone: '+62 857-2004-0035',
    email: 'Yohanes.noercahya@jlm.net.id',
    invited_by: 'Maria Al Ghibtiyah',
    meeting_date: '2026-05-07',
    meeting_format: 'Online'
  },
  {
    title: 'Mr.',
    first_name: 'Raymond',
    last_name: 'Setiono',
    company: 'Anugerah cahaya gemilang',
    business_field: 'Food & Beverage',
    phone: '081388830303',
    email: '8rasss@gmail.com',
    invited_by: 'Owen Fernando',
    meeting_date: '2026-05-07',
    meeting_format: 'Online'
  },
  {
    title: 'Ms.',
    first_name: 'Adrianne',
    last_name: 'Thailandra',
    company: 'RJ Legal Consultants',
    business_field: 'Legal & Accounting',
    phone: '08131817156',
    email: 'adrianne@rj-legal.co.id',
    invited_by: 'Jennyke Setiono',
    meeting_date: '2026-05-07',
    meeting_format: 'Online'
  },
  {
    title: 'Mr.',
    first_name: 'Agustinus',
    last_name: 'Wibowo',
    company: 'Safarnam',
    business_field: 'Travel',
    phone: '082121911911',
    email: 'agustinus.wibowo@gmail.com',
    invited_by: 'Mayawati Nurhalim',
    meeting_date: '2026-05-07',
    meeting_format: 'Online'
  }
]

async function main() {
  console.log('🚀 Starting import...\n')
  
  // Get all members for mapping
  const { data: members } = await supabase
    .from('members')
    .select('id, name')
  
  console.log(`📋 Found ${members?.length || 0} members\n`)
  
  // Create member name to id mapping
  const memberMap = {}
  members?.forEach(m => {
    memberMap[m.name.toLowerCase()] = m.id
  })
  
  let successCount = 0
  let skipCount = 0
  
  for (const v of visitors) {
    // Combine first and last name
    const fullName = [v.first_name, v.last_name].filter(Boolean).join(' ').trim()
    const titlePrefix = v.title ? `${v.title} ` : ''
    const displayName = `${titlePrefix}${fullName}`
    
    // Find member id
    const invitedByName = v.invited_by?.toLowerCase()
    const memberId = memberMap[invitedByName]
    
    if (!memberId) {
      console.log(`⚠️  SKIP: ${displayName} - Member "${v.invited_by}" not found`)
      skipCount++
      continue
    }
    
    // Clean phone number (take first number if multiple)
    let phone = v.phone.split(' atau ')[0].trim()
    
    // Insert visitor
    const { error } = await supabase
      .from('visitors')
      .insert({
        name: displayName,
        phone: phone,
        email: v.email || null,
        business_field: v.business_field || null,
        company: v.company || null,
        chapter: 'Grow',
        gender: v.title === 'Mrs.' || v.title === 'Ms.' ? 'Ibu' : 'Bapak',
        referred_by_member_id: memberId,
        meeting_date: v.meeting_date,
        status: 'new',
        notes: `Imported from Excel - Meeting Format: ${v.meeting_format}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    
    if (error) {
      console.log(`❌ ERROR: ${displayName} - ${error.message}`)
    } else {
      console.log(`✅ SUCCESS: ${displayName} (Invited by: ${v.invited_by})`)
      successCount++
    }
  }
  
  console.log(`\n📊 Summary:`)
  console.log(`   ✅ Imported: ${successCount}`)
  console.log(`   ⚠️  Skipped: ${skipCount}`)
  console.log(`   📝 Total: ${visitors.length}`)
}

main().catch(console.error)
