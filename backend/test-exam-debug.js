const http = require('http');

// Helper function to make HTTP requests
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsedData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', (err) => reject(err));
    
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Simple test to check API endpoints and trigger debug logs
async function testExamAPI() {
  console.log('🧪 Testing Exam API to check debug logs...');
  
  // First, try to get test series without authentication to see if we get proper error
  try {
    console.log('\n1. Testing GET /api/testSeries (should require auth)...');
    const response = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/testSeries',
      method: 'GET'
    });
    console.log('Response:', response);
  } catch (error) {
    console.log('Error:', error.message);
  }  // Try to create a test user (if registration is open)
  try {
    console.log('\n2. Testing user registration...');
    const registerPostData = JSON.stringify({
      username: 'testuser' + Date.now(), // Make unique
      name: 'Test User',
      email: 'testuser' + Date.now() + '@example.com', // Make unique
      password: 'testpassword123',
      role: 'student'
    });
    
    const registerResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(registerPostData)
      }
    }, registerPostData);
    
    console.log('Registration response:', registerResponse);

    if (registerResponse.status === 200 || registerResponse.status === 201) {
      console.log('\n3. Testing login...');
      const userData = JSON.parse(registerPostData);
      const loginPostData = JSON.stringify({
        email: userData.email,
        password: userData.password
      });
      
      const loginResponse = await makeRequest({
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(loginPostData)
        }
      }, loginPostData);
      
      console.log('Login response:', loginResponse);
      
      if (loginResponse.status === 200 && loginResponse.data.token) {
        console.log('\n4. Testing with authentication...');
        const token = loginResponse.data.token;
        
        // Try to access test series with auth
        const authResponse = await makeRequest({
          hostname: 'localhost',
          port: 5000,
          path: '/api/testSeries',
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('Authenticated test series response:', authResponse);
          // If we have test series, try to start one
        if (authResponse.data && Array.isArray(authResponse.data) && authResponse.data.length > 0) {
          // Find a test series with multiple sections for better debugging
          const multiSectionSeries = authResponse.data.find(series => 
            series.sections && Array.isArray(series.sections) && series.sections.length > 1
          );
          
          const testSeries = multiSectionSeries || authResponse.data[0];
          console.log(`\n5. Attempting to start test for series: ${testSeries._id}`);
          console.log(`   Title: ${testSeries.title}`);
          console.log(`   Sections count: ${testSeries.sections ? testSeries.sections.length : 0}`);
          console.log(`   RandomizeSectionOrder: ${testSeries.randomizeSectionOrder}`);
          
          const startTestPostData = JSON.stringify({
            seriesId: testSeries._id
          });
          
          const startTestResponse = await makeRequest({
            hostname: 'localhost',
            port: 5000,
            path: '/api/tests/start',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'Content-Length': Buffer.byteLength(startTestPostData)
            }
          }, startTestPostData);
          
          console.log('Start test response:', startTestResponse);
        } else {
          console.log('No test series found or unable to access test series');
        }
      }
    }
  } catch (error) {
    console.log('Error in test flow:', error.message);
  }
}

// Check if running as main module
if (require.main === module) {
  testExamAPI().catch(console.error);
}

module.exports = { testExamAPI };
