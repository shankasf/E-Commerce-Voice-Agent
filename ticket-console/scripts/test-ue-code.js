#!/usr/bin/env node
/**
 * Test U&E code validation endpoint
 */

require('dotenv').config({ path: '.env.local' });

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

async function testUECode(ueCode) {
  try {
    console.log(`\n🧪 Testing U&E code: ${ueCode}`);
    console.log('─'.repeat(50));
    
    const response = await fetch(`${API_BASE_URL}/api/auth/validate-ue-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ueCode: parseInt(ueCode) }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('✅ SUCCESS!');
      console.log(`   Organization: ${data.organization.name}`);
      console.log(`   U&E Code: ${data.organization.u_e_code}`);
      console.log(`   Manager: ${data.manager.name}`);
      return true;
    } else {
      console.log('❌ FAILED:', data.error || `HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    return false;
  }
}

async function checkDatabase() {
  console.log('🔍 Checking database connection...');
  console.log('─'.repeat(50));
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase credentials in .env.local');
    return;
  }

  console.log(`✅ Supabase URL: ${supabaseUrl}`);
  console.log(`✅ Service Key: ${supabaseKey.substring(0, 20)}...`);
  
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/organizations?select=organization_id,name,u_e_code&limit=5`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.ok) {
      const orgs = await response.json();
      console.log(`\n📋 Found ${orgs.length} organizations:`);
      orgs.forEach(org => {
        console.log(`   - ${org.name} (U&E: ${org.u_e_code || 'N/A'}, ID: ${org.organization_id})`);
      });
      return orgs;
    } else {
      console.log(`❌ Database query failed: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.log(`   Response: ${text.substring(0, 200)}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return null;
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════');
  console.log('🧪 U&E Code Validation Test');
  console.log('═══════════════════════════════════════════');
  
  // First check database
  const orgs = await checkDatabase();
  
  if (orgs && orgs.length > 0) {
    // Test with existing codes
    for (const org of orgs) {
      if (org.u_e_code) {
        await testUECode(org.u_e_code);
      }
    }
  } else {
    // Test with default code from schema
    await testUECode(10001);
  }
  
  // Test invalid code
  await testUECode(99999);
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Test complete!');
  console.log('='.repeat(50) + '\n');
}

runTests().catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
