/**
 * Create device_connections table directly using Supabase client
 * Uses the service role key we already have
 */

require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Try to get connection string directly from PG_CONNECTION_URI
let connectionString = process.env.PG_CONNECTION_URI;

// If not found, try to build from components
if (!connectionString) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const projectRef = supabaseUrl?.replace('https://', '').replace('.supabase.co', '') || '';
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  
  if (!dbPassword) {
    console.log('\n⚠️  Need either PG_CONNECTION_URI or SUPABASE_DB_PASSWORD in .env.local');
    process.exit(1);
  }
  
  connectionString = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;
}

console.log('🚀 Creating device_connections table directly...');

// Read SQL file
const sqlPath = path.join(__dirname, '..', 'db', 'device_connections_complete.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

console.log(`🔌 Connecting to database...`);

console.log(`🔌 Connection string: ${connectionString.replace(/:[^:@]+@/, ':****@')}`);

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createTable() {
  try {
    await client.connect();
    console.log('✅ Connected!\n');

    console.log('📝 Executing SQL...');
    
    // Split SQL by semicolons and execute each statement
    // But handle DO blocks specially
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement.length === 0) continue;
      
      // Handle DO blocks (they end with $$;)
      if (statement.includes('DO $$')) {
        // Find the matching END $$;
        let fullStatement = statement;
        let j = i + 1;
        while (j < statements.length && !statements[j].includes('END $$')) {
          fullStatement += ';' + statements[j];
          j++;
        }
        if (j < statements.length) {
          fullStatement += ';' + statements[j];
          i = j;
        }
        
        try {
          await client.query(fullStatement);
          console.log(`✅ Executed statement ${i + 1}`);
        } catch (err) {
          // Ignore "already exists" errors
          if (err.message.includes('already exists') || err.message.includes('duplicate')) {
            console.log(`⚠️  Statement ${i + 1} already exists (skipping)`);
          } else {
            console.error(`❌ Error in statement ${i + 1}:`, err.message);
          }
        }
      } else {
        try {
          await client.query(statement);
          console.log(`✅ Executed statement ${i + 1}`);
        } catch (err) {
          // Ignore "already exists" errors
          if (err.message.includes('already exists') || err.message.includes('duplicate') || err.message.includes('IF NOT EXISTS')) {
            console.log(`⚠️  Statement ${i + 1} already exists (skipping)`);
          } else {
            console.error(`❌ Error in statement ${i + 1}:`, err.message);
            console.error(`   Statement: ${statement.substring(0, 100)}...`);
          }
        }
      }
    }

    console.log('\n✅ SQL execution complete!\n');

    // Verify table exists
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'device_connections'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Verification: device_connections table exists!');
      
      // Check columns
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'device_connections'
        ORDER BY ordinal_position
      `);
      
      console.log(`✅ Verification: ${columns.rows.length} columns found:`);
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
      
      console.log('\n🎉 Success! Table created. Ready to test!');
    }

    await client.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('password authentication')) {
      console.log('\n💡 Password might be incorrect. Double-check SUPABASE_DB_PASSWORD');
    }
    
    await client.end().catch(() => {});
    process.exit(1);
  }
}

createTable();
