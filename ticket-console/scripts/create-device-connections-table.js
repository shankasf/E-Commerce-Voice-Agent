/**
 * Script to create device_connections table in Supabase
 * Uses PostgreSQL direct connection to execute SQL
 */

require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials in .env.local');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Extract project reference from Supabase URL
// Format: https://<project-ref>.supabase.co
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

console.log('📋 Creating device_connections table...');
console.log(`📍 Project: ${projectRef}`);

// Read SQL schema
const sqlPath = path.join(__dirname, '..', 'db', 'device_connections_schema.sql');
let sqlSchema;

try {
  sqlSchema = fs.readFileSync(sqlPath, 'utf8');
  console.log(`✅ Read SQL schema from: ${sqlPath}\n`);
} catch (error) {
  console.error(`❌ Error reading SQL file: ${error.message}`);
  process.exit(1);
}

// Build connection string
// Supabase database connection: postgresql://postgres:[PASSWORD]@db.[project-ref].supabase.co:5432/postgres
// We need the database password - it's not in the service role key
// Let's try to get it from environment or prompt user

const dbPassword = process.env.SUPABASE_DB_PASSWORD;

if (!dbPassword) {
  console.log('⚠️  Database password not found in .env.local');
  console.log('   You need the database password to connect directly.');
  console.log('\n📝 To get the password:');
  console.log('   1. Go to: https://supabase.com/dashboard/project/' + projectRef);
  console.log('   2. Navigate to: Settings → Database');
  console.log('   3. Copy the "Connection string" (looks like: postgresql://postgres:[YOUR-PASSWORD]@...)');
  console.log('   4. Extract the password from the connection string');
  console.log('   5. Add to .env.local: SUPABASE_DB_PASSWORD=your_password');
  console.log('\n   Or ask your teammate for the database password.\n');
  
  // Alternative: Use Supabase Management API or SQL Editor REST API
  console.log('💡 Alternative: Use Supabase Dashboard SQL Editor');
  console.log('   1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql');
  console.log('   2. Paste the SQL below and click "Run"\n');
  console.log('─'.repeat(80));
  console.log(sqlSchema);
  console.log('─'.repeat(80));
  process.exit(1);
}

// Build connection string
const connectionString = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;

console.log(`🔌 Connecting to database...`);

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false // Supabase requires SSL
  }
});

async function createTable() {
  try {
    await client.connect();
    console.log('✅ Connected to database!\n');

    // Execute SQL
    console.log('📝 Executing SQL...');
    await client.query(sqlSchema);
    
    console.log('✅ device_connections table created successfully!\n');

    // Verify table exists
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'device_connections'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Verification: Table exists in database!');
      
      // Check indexes
      const indexResult = await client.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'device_connections'
      `);
      
      console.log(`✅ Verification: ${indexResult.rows.length} indexes created`);
      console.log('\n🎉 Success! You can now test the code generation endpoint.\n');
    }

    await client.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error creating table:');
    console.error(`   ${error.message}\n`);
    
    if (error.message.includes('password authentication')) {
      console.log('💡 Tip: The database password might be incorrect.');
      console.log('   Double-check SUPABASE_DB_PASSWORD in .env.local\n');
    }
    
    await client.end().catch(() => {});
    process.exit(1);
  }
}

createTable();
