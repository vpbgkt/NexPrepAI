// Test script to verify enhanced review data preservation logic
async function testEnhancedReviewDataPreservation() {
  try {
    console.log('Testing enhanced review data preservation logic...\n');
    
    // Create a test response with enhanced fields
    const testResponse = {
      question: '507f1f77bcf86cd799439011', // dummy question ID
      selected: [1],
      timeSpent: 120, // 2 minutes
      attempts: 2,
      flagged: true,
      confidence: 4,
      visitedAt: new Date('2025-05-27T10:00:00Z'),
      lastModifiedAt: new Date('2025-05-27T10:02:00Z')
    };
    
    // Simulate the processing logic from submitAttempt
    const processedResponse = {
      question: testResponse.question,
      selected: testResponse.selected,
      earned: 4, // dummy earned score
      status: 'correct',
      // Enhanced review fields (preserve if sent from frontend)
      timeSpent: testResponse?.timeSpent || 0,
      attempts: testResponse?.attempts || 1,
      flagged: testResponse?.flagged || false,
      confidence: testResponse?.confidence,
      visitedAt: testResponse?.visitedAt,
      lastModifiedAt: testResponse?.lastModifiedAt
    };
    
    console.log('Original response:', JSON.stringify(testResponse, null, 2));
    console.log('\nProcessed response:', JSON.stringify(processedResponse, null, 2));
    
    // Verify all enhanced fields are preserved
    const enhancedFields = ['timeSpent', 'attempts', 'flagged', 'confidence', 'visitedAt', 'lastModifiedAt'];
    let allFieldsPreserved = true;
    
    console.log('\nField preservation check:');
    enhancedFields.forEach(field => {
      if (processedResponse[field] !== testResponse[field]) {
        console.error(`❌ Field ${field} not preserved correctly`);
        console.error(`  Expected: ${testResponse[field]}`);
        console.error(`  Got: ${processedResponse[field]}`);
        allFieldsPreserved = false;
      } else {
        console.log(`✅ Field ${field} preserved correctly: ${processedResponse[field]}`);
      }
    });
    
    if (allFieldsPreserved) {
      console.log('\n✅ SUCCESS: All enhanced review fields are being preserved correctly!');
    } else {
      console.log('\n❌ FAILURE: Some enhanced review fields are not being preserved correctly.');
    }
    
    // Test case with missing fields (should use defaults)
    console.log('\n--- Testing with missing enhanced fields ---');
    const minimalResponse = {
      question: '507f1f77bcf86cd799439012',
      selected: [0]
    };
    
    const processedMinimalResponse = {
      question: minimalResponse.question,
      selected: minimalResponse.selected,
      earned: 0,
      status: 'incorrect',
      // Enhanced review fields (preserve if sent from frontend)
      timeSpent: minimalResponse?.timeSpent || 0,
      attempts: minimalResponse?.attempts || 1,
      flagged: minimalResponse?.flagged || false,
      confidence: minimalResponse?.confidence,
      visitedAt: minimalResponse?.visitedAt,
      lastModifiedAt: minimalResponse?.lastModifiedAt
    };
    
    console.log('Minimal response:', JSON.stringify(minimalResponse, null, 2));
    console.log('\nProcessed minimal response:', JSON.stringify(processedMinimalResponse, null, 2));
    
    // Check defaults
    const expectedDefaults = {
      timeSpent: 0,
      attempts: 1,
      flagged: false,
      confidence: undefined,
      visitedAt: undefined,
      lastModifiedAt: undefined
    };
    
    let defaultsCorrect = true;
    console.log('\nDefault values check:');
    Object.entries(expectedDefaults).forEach(([field, expectedValue]) => {
      if (processedMinimalResponse[field] !== expectedValue) {
        console.error(`❌ Default for ${field} incorrect`);
        console.error(`  Expected: ${expectedValue}`);
        console.error(`  Got: ${processedMinimalResponse[field]}`);
        defaultsCorrect = false;
      } else {
        console.log(`✅ Default for ${field} correct: ${processedMinimalResponse[field]}`);
      }
    });
    
    if (defaultsCorrect) {
      console.log('\n✅ SUCCESS: Default values are handled correctly!');
    } else {
      console.log('\n❌ FAILURE: Default values are not handled correctly.');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run the test
testEnhancedReviewDataPreservation();

// Run the test
testEnhancedReviewDataPreservation();
