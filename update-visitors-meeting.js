const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read .env.local
const envPath = path.join(__dirname, '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=')
  if (key && value) {
    envVars[key.trim()] = value.trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateVisitorsToMeeting() {
  try {
    console.log('🔍 Searching for meeting on 7 Mei 2026...')
    
    // Find meeting on 2026-05-07
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('id, title, meeting_date')
      .eq('meeting_date', '2026-05-07')
      .single()
    
    if (meetingError || !meeting) {
      console.error('❌ Meeting 7 Mei 2026 not found!')
      console.error('Error:', meetingError)
      return
    }
    
    console.log(`✅ Found meeting: ${meeting.title} (${meeting.meeting_date})`)
    console.log(`   ID: ${meeting.id}`)
    
    // Find visitors named Dasep Badrusalam and William Eka
    const names = ['Dasep Badrusalam', 'William Eka']
    
    for (const name of names) {
      console.log(`\n📝 Updating visitor: ${name}`)
      
      const { data: visitor, error: visitorError } = await supabase
        .from('visitors')
        .select('id, name, meeting_id')
        .eq('name', name)
        .single()
      
      if (visitorError) {
        console.error(`   ❌ Visitor ${name} not found!`)
        continue
      }
      
      console.log(`   Current meeting_id: ${visitor.meeting_id || 'null'}`)
      
      // Update visitor's meeting_id
      const { error: updateError } = await supabase
        .from('visitors')
        .update({ meeting_id: meeting.id })
        .eq('id', visitor.id)
      
      if (updateError) {
        console.error(`   ❌ Failed to update: ${updateError.message}`)
      } else {
        console.log(`   ✅ Successfully updated to meeting ${meeting.id}`)
      }
    }
    
    console.log('\n✅ Done! Verifying updates...')
    
    // Verify updates
    const { data: updatedVisitors } = await supabase
      .from('visitors')
      .select(`
        id,
        name,
        company,
        meeting_id,
        meetings!inner (
          title,
          meeting_date
        )
      `)
      .in('name', names)
    
    console.log('\n📊 Updated visitors:')
    updatedVisitors?.forEach(v => {
      const m = Array.isArray(v.meetings) ? v.meetings[0] : v.meetings
      console.log(`   - ${v.name} (${v.company || 'N/A'}) → ${m?.title} (${m?.meeting_date})`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

updateVisitorsToMeeting()
