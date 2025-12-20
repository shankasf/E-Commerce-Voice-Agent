const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://wzmcmbkouodsfbfxaozd.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bWNtYmtvdW9kc2ZiZnhhb3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NzQzNDcsImV4cCI6MjA4MDQ1MDM0N30.fF2Qf4XWC-WP80KiVnKcsULihz2c-WzNGTQ6u3t6yhs'
);

async function test() {
    console.log('Testing Supabase connection...\n');

    // Try common table names to see what exists
    const tables = ['products', 'ticket_types', 'organizations', 'users', 'contacts', 'support_tickets', 'ticket_statuses', 'ticket_priorities'];

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(3);
        if (error) {
            console.log(`❌ ${table}: ${error.message}`);
        } else {
            console.log(`✅ ${table}: ${data.length} rows found`);
            if (data.length > 0) {
                console.log('   Sample:', JSON.stringify(data[0], null, 2).substring(0, 200));
            }
        }
    }
}

test().catch(console.error);
