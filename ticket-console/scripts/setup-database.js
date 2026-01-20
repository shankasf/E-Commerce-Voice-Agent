/**
 * Setup database using your Supabase credentials
 * Uses the connection string to execute SQL directly
 */

require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up database with your Supabase credentials...\n');

// Get connection string from PG_CONNECTION_URI
const connectionString = process.env.PG_CONNECTION_URI;

if (!connectionString) {
  console.error('❌ PG_CONNECTION_URI not found in .env.local');
  console.log('\n📝 You need to add your database connection string.');
  console.log('Get it from Supabase Dashboard → Settings → Database → Connection string');
  console.log('Format: postgresql://postgres:[PASSWORD]@db.[project-ref].supabase.co:5432/postgres');
  console.log('\nAdd to .env.local:');
  console.log('PG_CONNECTION_URI=postgresql://postgres:your_password@db.wwdzxovkandfyohsfybm.supabase.co:5432/postgres');
  process.exit(1);
}

console.log(`📍 Using connection: ${connectionString.replace(/:[^:@]+@/, ':****@')}\n`);

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function setupDatabase() {
  try {
    await client.connect();
    console.log('✅ Connected to database!\n');

    // Step 1: Create devices table (needed for device_connections FK)
    console.log('📝 Step 1: Creating devices table...');
    const devicesSQL = `
CREATE TABLE IF NOT EXISTS devices (
    device_id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    asset_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'ONLINE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO devices (device_id, organization_id, asset_name, status) VALUES 
    (1, 1, 'Test Device', 'ONLINE')
ON CONFLICT (device_id) DO NOTHING;

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow anonymous all" ON devices FOR ALL USING (true);
GRANT ALL ON devices TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE devices_device_id_seq TO anon, authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE devices;
ALTER TABLE devices REPLICA IDENTITY FULL;
    `.trim();

    try {
      await client.query(devicesSQL);
      console.log('✅ devices table created!\n');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('⚠️  devices table already exists (skipping)\n');
      } else {
        console.error('❌ Error creating devices table:', err.message);
        throw err;
      }
    }

    // Step 2: Create device_connections table
    console.log('📝 Step 2: Creating device_connections table...');
    const deviceConnectionsSQL = fs.readFileSync(
      path.join(__dirname, '..', 'db', 'device_connections_complete.sql'),
      'utf8'
    );

    // Execute SQL - handle multiple statements
    const statements = deviceConnectionsSQL.split(';').filter(s => s.trim().length > 0 && !s.trim().startsWith('--'));
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement.length === 0 || statement.startsWith('--')) continue;

      // Handle DO blocks
      if (statement.includes('DO $$')) {
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
        } catch (err) {
          if (!err.message.includes('already exists') && !err.message.includes('duplicate') && !err.message.includes('IF NOT EXISTS')) {
            console.error(`⚠️  Error in statement: ${err.message.substring(0, 100)}`);
          }
        }
      } else {
        try {
          await client.query(statement);
        } catch (err) {
          if (!err.message.includes('already exists') && !err.message.includes('duplicate') && !err.message.includes('IF NOT EXISTS')) {
            console.error(`⚠️  Error in statement: ${err.message.substring(0, 100)}`);
          }
        }
      }
    }

    console.log('✅ device_connections table created!\n');

    // Verify
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('devices', 'device_connections')
      ORDER BY table_name
    `);

    console.log('✅ Verification:');
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name} table exists`);
    });

    // Check device_connections columns
    const columns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'device_connections'
      ORDER BY ordinal_position
    `);
    
    console.log(`\n✅ device_connections has ${columns.rows.length} columns:`);
    columns.rows.slice(0, 10).forEach(col => {
      console.log(`   - ${col.column_name}`);
    });
    if (columns.rows.length > 10) {
      console.log(`   ... and ${columns.rows.length - 10} more`);
    }

    console.log('\n🎉 Database setup complete! Ready to test!\n');

    await client.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('password authentication')) {
      console.log('\n💡 Password might be incorrect');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 Cannot connect to database hostname');
      console.log('   Check if PG_CONNECTION_URI is correct');
      console.log('   Format should be: postgresql://postgres:password@db.project-ref.supabase.co:5432/postgres');
    } else if (error.message.includes('relation "organizations" does not exist')) {
      console.log('\n💡 Need to create base tables first!');
      console.log('   Run db/schema.sql in Supabase SQL Editor first');
    }
    
    await client.end().catch(() => {});
    process.exit(1);
  }
}

setupDatabase();
