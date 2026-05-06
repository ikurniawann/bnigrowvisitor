const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jvzqfvcqgwyonjxjnpjl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2enFmdmNxZ3d5b25qeGpucGpsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMxNzM5OCwiZXhwIjoyMDg5ODkzMzk4fQ.niwA_OMAg_B_2POvdpnaVPRRj_wSw6OFjhimBqj08Ms';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  try {
    // Check auth users
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('Error:', error.message);
      return;
    }
    
    console.log('\n=== Registered Users ===\n');
    users.users.forEach((user, idx) => {
      console.log(`${idx + 1}. Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log('');
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkUsers();
