const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jvzqfvcqgwyonjxjnpjl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2enFmdmNxZ3d5b25qeGpucGpsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMxNzM5OCwiZXhwIjoyMDg5ODkzMzk4fQ.niwA_OMAg_B_2POvdpnaVPRRj_wSw6OFjhimBqj08Ms';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateAllVisitors() {
  try {
    console.log('📋 Fetching all visitors...\n');
    
    // Get all visitors
    const { data: visitors, error: fetchError } = await supabase
      .from('visitors')
      .select('*');
    
    if (fetchError) {
      console.error('❌ Error fetching visitors:', fetchError.message);
      return;
    }
    
    console.log(`✅ Found ${visitors.length} visitors\n`);
    
    if (visitors.length === 0) {
      console.log('No visitors to update.');
      return;
    }
    
    // Update all visitors with new meeting date
    const newMeetingDate = '2026-04-30';
    
    console.log('🔄 Updating meeting_date to', newMeetingDate, '...\n');
    
    const { data: updatedData, error: updateError } = await supabase
      .from('visitors')
      .update({ meeting_date: newMeetingDate })
      .neq('id', null); // Update all rows
    
    if (updateError) {
      console.error('❌ Error updating visitors:', updateError.message);
      return;
    }
    
    console.log('✅ Successfully updated all visitors!\n');
    console.log('📊 Summary:');
    console.log(`   - Total visitors: ${visitors.length}`);
    console.log(`   - Updated meeting_date to: ${newMeetingDate}`);
    console.log(`   - Updated at: ${new Date().toLocaleString('id-ID')}\n`);
    
    // Show updated visitors
    console.log('📝 Updated Visitors List:\n');
    console.log('No. | Name | Company | Position | Meeting Date');
    console.log('----|------|---------|----------|-------------');
    
    visitors.forEach((visitor, idx) => {
      console.log(`${(idx + 1).toString().padStart(3)} | ${visitor.name?.padEnd(20) || 'N/A'} | ${visitor.company?.padEnd(15) || 'N/A'} | ${visitor.position?.padEnd(12) || 'N/A'} | ${newMeetingDate}`);
    });
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

updateAllVisitors();
