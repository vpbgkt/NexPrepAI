const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testPdfApiEndpoint() {
  console.log('🔄 Testing PDF API endpoint...');
  
  try {
    // Use one of the attempt IDs from the logs
    const attemptId = '6834cd46f32d28f25a8a8591'; // From the error logs
    const url = `http://localhost:5000/api/tests/${attemptId}/pdf`;
    
    console.log(`📡 Making request to: ${url}`);
    
    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: 30000 // 30 second timeout
    });
    
    // Save the PDF to a file
    const outputPath = path.join(__dirname, 'test-api-generated.pdf');
    const writer = fs.createWriteStream(outputPath);
    
    response.data.pipe(writer);
    
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    
    console.log('✅ PDF API test successful!');
    console.log(`📁 PDF saved to: ${outputPath}`);
    console.log(`📊 Response status: ${response.status}`);
    console.log(`📋 Content-Type: ${response.headers['content-type']}`);
    
    // Check file size
    const stats = fs.statSync(outputPath);
    console.log(`📏 File size: ${(stats.size / 1024).toFixed(2)} KB`);
    
  } catch (error) {
    console.error('❌ PDF API test failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${error.response.data}`);
    } else {
      console.error(error.message);
    }
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testPdfApiEndpoint()
    .then(() => {
      console.log('🎉 PDF API test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 PDF API test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testPdfApiEndpoint };
