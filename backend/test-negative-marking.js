// Test negative marking logic
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nexprep', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const TestSeries = require('./models/TestSeries');
const TestAttempt = require('./models/TestAttempt');

async function testNegativeMarking() {
  try {
    console.log('🔍 Testing negative marking logic...\n');
    
    // Find a test series with negative marking enabled
    const testSeries = await TestSeries.findOne({ negativeMarking: true })
      .populate('sections.questions.question', 'type correctAnswer options translations');
    
    if (!testSeries) {
      console.log('❌ No test series found with negative marking enabled');
      console.log('📝 Creating a test series with negative marking...');
      
      // Check if there are any test series at all
      const anyTestSeries = await TestSeries.findOne();
      if (anyTestSeries) {
        console.log(`📄 Updating existing test series: ${anyTestSeries.title}`);
        anyTestSeries.negativeMarking = true;
        anyTestSeries.defaultNegativeMarks = 1;
        await anyTestSeries.save();
        console.log('✅ Updated test series with negative marking');
      } else {
        console.log('❌ No test series found at all');
      }
      return;
    }
    
    console.log(`📋 Test Series: ${testSeries.title}`);
    console.log(`🔢 Negative Marking Enabled: ${testSeries.negativeMarking}`);
    console.log(`➖ Default Negative Marks: ${testSeries.defaultNegativeMarks}`);
    console.log(`📊 Total Marks: ${testSeries.totalMarks}`);
    
    // Find recent test attempts for this series
    const recentAttempts = await TestAttempt.find({ 
      series: testSeries._id 
    })
    .populate('series', 'title negativeMarking defaultNegativeMarks')
    .sort({ submittedAt: -1 })
    .limit(5);
    
    console.log(`\n📈 Found ${recentAttempts.length} recent attempts:`);
    
    recentAttempts.forEach((attempt, index) => {
      console.log(`\n--- Attempt ${index + 1} ---`);
      console.log(`🆔 ID: ${attempt._id}`);
      console.log(`👤 User: ${attempt.user}`);
      console.log(`💯 Score: ${attempt.score}`);
      console.log(`📊 Max Score: ${attempt.maxScore}`);
      console.log(`📅 Submitted: ${attempt.submittedAt}`);
      
      // Check responses for negative scoring
      if (attempt.responses && attempt.responses.length > 0) {
        let negativeCount = 0;
        let positiveCount = 0;
        let unansweredCount = 0;
        
        attempt.responses.forEach(response => {
          if (response.earnedMarks > 0) positiveCount++;
          else if (response.earnedMarks < 0) negativeCount++;
          else unansweredCount++;
        });
        
        console.log(`✅ Correct: ${positiveCount}`);
        console.log(`❌ Incorrect (negative): ${negativeCount}`);
        console.log(`⭕ Unanswered: ${unansweredCount}`);
        
        // Show some sample incorrect responses
        const incorrectResponses = attempt.responses.filter(r => r.earnedMarks < 0).slice(0, 3);
        if (incorrectResponses.length > 0) {
          console.log('📝 Sample incorrect responses:');
          incorrectResponses.forEach(resp => {
            console.log(`   Question: ${resp.question}, Earned: ${resp.earnedMarks}, Status: ${resp.status}`);
          });
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error testing negative marking:', error);
  } finally {
    mongoose.connection.close();
  }
}

testNegativeMarking();
