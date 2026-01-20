#!/usr/bin/env node
/**
 * Quick endpoint verification script
 * Tests the 6-digit code creation and verification endpoints
 */

require('dotenv').config({ path: '.env.local' });

// Use fetch (Node.js 18+) or axios if available
let fetch;
try {
  fetch = require('axios');
  // Wrap axios to match fetch API
  const axios = fetch;
  fetch = async (url, options = {}) => {
    try {
      const response = await axios({
        url,
        method: options.method || 'GET',
        data: options.body ? JSON.parse(options.body) : undefined,
        headers: options.headers || {},
        validateStatus: () => true, // Don't throw on non-2xx
        timeout: options.timeout || 5000,
      });
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        json: async () => response.data,
        text: async () => JSON.stringify(response.data),
      };
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('ECONNREFUSED');
      }
      throw error;
    }
  };
} catch {
  // Use native fetch (Node.js 18+)
  fetch = globalThis.fetch || require('node-fetch');
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// Test data (from the database we just created)
const TEST_USER_ID = 1;
const TEST_DEVICE_ID = 1;
const TEST_ORG_ID = 1;

console.log('🧪 Testing 6-Digit Code Endpoints\n');
console.log(`API Base URL: ${API_BASE_URL}\n`);

async function testCreateCode() {
  console.log('📝 Test 1: Create 6-digit code');
  console.log('─'.repeat(50));
  
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/client-application/device-connections/create-six-digit-code`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          device_id: TEST_DEVICE_ID,
          organization_id: TEST_ORG_ID,
        }),
        timeout: 5000,
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('✅ SUCCESS!');
      console.log(`   Code: ${data.code}`);
      console.log(`   Session ID: ${data.session_id}`);
      console.log(`   WebSocket URL: ${data.websocket_url}`);
      console.log(`   Expires in: ${data.expires_in_seconds}s`);
      return data;
    } else {
      console.log('❌ FAILED:', data.error || `HTTP ${response.status}`);
      return null;
    }
  } catch (error) {
    if (error.message === 'ECONNREFUSED') {
      console.log('❌ FAILED: Server not running');
      console.log('   Start server with: npm run dev');
    } else {
      console.log('❌ FAILED:', error.message);
    }
    return null;
  }
}

async function testVerifyCode(codeData) {
  if (!codeData) {
    console.log('\n⏭️  Skipping verification test (code creation failed)\n');
    return;
  }

  console.log('\n🔐 Test 2: Verify 6-digit code');
  console.log('─'.repeat(50));
  
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/client-application/device-connections/verify-code-return-url`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          device_id: TEST_DEVICE_ID,
          organization_id: TEST_ORG_ID,
          six_digit_code: codeData.code,
        }),
        timeout: 5000,
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('✅ SUCCESS!');
      const url = data.websocket_url || data.connection_url;
      console.log(`   Connection URL: ${url}`);
      console.log(`   Session ID: ${data.session_id}`);
      console.log(`   Expires in: ${data.expires_in_seconds}s`);
      return true;
    } else {
      console.log('❌ FAILED:', data.error || `HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error.message === 'ECONNREFUSED') {
      console.log('❌ FAILED: Server not running');
      console.log('   Start server with: npm run dev');
    } else {
      console.log('❌ FAILED:', error.message);
    }
    return false;
  }
}

async function testVerifyInvalidCode() {
  console.log('\n🚫 Test 3: Verify invalid code (should fail)');
  console.log('─'.repeat(50));
  
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/client-application/device-connections/verify-code-return-url`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          device_id: TEST_DEVICE_ID,
          organization_id: TEST_ORG_ID,
          six_digit_code: 'INVALID',
        }),
        timeout: 5000,
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.log('✅ SUCCESS! (correctly rejected invalid code)');
      console.log(`   Error: ${data.error || `HTTP ${response.status}`}`);
      return true;
    } else {
      console.log('❌ FAILED: Should have rejected invalid code');
      return false;
    }
  } catch (error) {
    console.log('❌ FAILED:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('Using test data:');
  console.log(`  User ID: ${TEST_USER_ID}`);
  console.log(`  Device ID: ${TEST_DEVICE_ID}`);
  console.log(`  Organization ID: ${TEST_ORG_ID}\n`);

  const codeData = await testCreateCode();
  const verifySuccess = await testVerifyCode(codeData);
  const invalidCodeSuccess = await testVerifyInvalidCode();

  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary:');
  console.log('='.repeat(50));
  console.log(`Create Code: ${codeData ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Verify Code: ${verifySuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Reject Invalid: ${invalidCodeSuccess ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = codeData && verifySuccess && invalidCodeSuccess;
  console.log('\n' + (allPassed ? '🎉 All tests passed!' : '⚠️  Some tests failed'));
  console.log('='.repeat(50) + '\n');

  process.exit(allPassed ? 0 : 1);
}

runTests().catch((error) => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
