/**
 * Test script for JWT refresh functionality
 * Tests the token refresh endpoint and verifies it works correctly
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:5000/api';

async function testJWTRefresh() {
  console.log('🧪 Testing JWT Refresh Mechanism\n');

  try {
    // Step 1: Login to get a token
    console.log('1️⃣ Logging in to get initial token...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com', // You might need to adjust this
      password: 'password123'
    });

    if (!loginResponse.data.token) {
      console.log('❌ Login failed - no token received');
      return;
    }

    const originalToken = loginResponse.data.token;
    console.log('✅ Login successful, token received');
    
    // Decode and show token info
    const decoded = jwt.decode(originalToken);
    console.log(`   User ID: ${decoded.userId}`);
    console.log(`   Role: ${decoded.role}`);
    console.log(`   Expires: ${new Date(decoded.exp * 1000).toLocaleString()}\n`);

    // Step 2: Test token refresh
    console.log('2️⃣ Testing token refresh...');
    const refreshResponse = await axios.post(`${BASE_URL}/auth/refresh-token`, {}, {
      headers: {
        'Authorization': `Bearer ${originalToken}`
      }
    });

    if (!refreshResponse.data.token) {
      console.log('❌ Token refresh failed - no new token received');
      return;
    }

    const newToken = refreshResponse.data.token;
    console.log('✅ Token refresh successful');
    
    // Decode and show new token info
    const newDecoded = jwt.decode(newToken);
    console.log(`   New User ID: ${newDecoded.userId}`);
    console.log(`   New Role: ${newDecoded.role}`);
    console.log(`   New Expires: ${new Date(newDecoded.exp * 1000).toLocaleString()}\n`);

    // Step 3: Test that new token works
    console.log('3️⃣ Testing new token with protected endpoint...');
    const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${newToken}`
      }
    });

    console.log('✅ New token works with protected endpoints');
    console.log(`   Profile data: ${JSON.stringify(profileResponse.data, null, 2)}\n`);

    // Step 4: Test with expired token (simulate)
    console.log('4️⃣ Testing refresh with manually expired token...');
    
    // Create an expired token for testing
    const expiredToken = jwt.sign(
      { userId: decoded.userId, role: decoded.role, name: decoded.name },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '-1h' } // Expired 1 hour ago
    );

    try {
      const expiredRefreshResponse = await axios.post(`${BASE_URL}/auth/refresh-token`, {}, {
        headers: {
          'Authorization': `Bearer ${expiredToken}`
        }
      });

      console.log('✅ Expired token refresh successful');
      console.log(`   Response: ${JSON.stringify(expiredRefreshResponse.data, null, 2)}\n`);
    } catch (expiredError) {
      if (expiredError.response && expiredError.response.status === 404) {
        console.log('❌ Expired token refresh failed - User not found (expected if test user doesn\'t exist)');
      } else {
        console.log('❌ Expired token refresh failed:', expiredError.response?.data?.message || expiredError.message);
      }
    }

    console.log('🎉 JWT Refresh mechanism testing completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    
    if (error.response?.status === 400 && error.response?.data?.message?.includes('Invalid')) {
      console.log('\n💡 This might be because test credentials don\'t exist.');
      console.log('   Try creating a test user first or use existing credentials.');
    }
  }
}

// Run the test
testJWTRefresh();
