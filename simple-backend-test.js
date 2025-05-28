const axios = require('axios');

async function testBackend() {
    console.log('🔍 Testing backend server...');
    
    try {
        const response = await axios.get('http://localhost:5000');
        console.log('✅ Backend server is running');
        console.log('Response:', response.status);
        return true;
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ Backend server is not running');
            console.log('Please start it with: cd backend && npm start');
        } else {
            console.log('⚠️ Backend server test failed:', error.message);
        }
        return false;
    }
}

testBackend();
