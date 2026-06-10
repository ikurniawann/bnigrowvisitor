const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

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
