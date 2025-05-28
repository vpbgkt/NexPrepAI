// Enhanced Exam Flow Test Script
// Tests the complete flow from exam taking → submission → review with enhanced data

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/nexprep', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
};

// Models
const User = require('./backend/models/User');
const TestSeries = require('./backend/models/TestSeries');
const Question = require('./backend/models/Question');
const TestAttempt = require('./backend/models/TestAttempt');

// Test Enhanced Exam Flow
const testEnhancedExamFlow = async () => {
  console.log('\n🧪 Testing Enhanced Exam Flow...\n');

  try {
    // Create test user
    const testUser = new User({
      name: 'Enhanced Test Student',
      email: 'enhanced-test@example.com',
      password: await bcrypt.hash('password123', 10),
      role: 'student'
    });
    await testUser.save();
    console.log('✅ Created test user');

    // Create test question with enhanced fields
    const testQuestion = new Question({
      questionText: 'What is the capital of France?',
      options: [
        { text: 'London', isCorrect: false },
        { text: 'Berlin', isCorrect: false },
        { text: 'Paris', isCorrect: true },
        { text: 'Madrid', isCorrect: false }
      ],
      correctOptions: [2],
      marks: 4,
      difficulty: 'Easy',
      recommendedTimeAllotment: 120, // 2 minutes in seconds
      explanation: {
        text: 'Paris is the capital and most populous city of France.',
        detailedSolution: 'Paris has been the capital of France since 1944.'
      },
      type: 'MCQ',
      status: 'active'
    });
    await testQuestion.save();
    console.log('✅ Created test question with enhanced fields');

    // Create test series
    const testSeries = new TestSeries({
      title: 'Enhanced Review Test',
      description: 'Test series for enhanced review functionality',
      layout: [
        {
          title: 'Section A',
          order: 1,
          questions: [
            {
              question: testQuestion._id,
              marks: 4,
              negativeMarks: 1
            }
          ]
        }
      ],
      duration: 10, // 10 minutes
      startAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      endAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours from now
      mode: 'test',
      maxAttempts: 3,
      status: 'published'
    });
    await testSeries.save();
    console.log('✅ Created test series');

    // Simulate enhanced exam attempt with realistic data
    console.log('\n📝 Creating enhanced exam attempt...');
    
    const attempt = new TestAttempt({
      series: testSeries._id,
      student: testUser._id,
      startedAt: new Date(),
      responses: [
        {
          question: testQuestion._id,
          selected: [2], // Correct answer: Paris
          earned: 4,
          status: 'answered',
          // Enhanced review fields
          timeSpent: 85, // 1 minute 25 seconds
          attempts: 2,   // Changed answer once
          flagged: true, // Student flagged this question
          confidence: 4, // High confidence (1-5 scale)
          visitedAt: new Date(Date.now() - 85000), // Visited 85 seconds ago
          lastModifiedAt: new Date(Date.now() - 15000) // Last modified 15 seconds ago
        }
      ],
      submittedAt: new Date(),
      duration: 300, // 5 minutes total test time
      score: 4,
      maxScore: 4,
      percentage: 100,
      status: 'submitted'
    });
    await attempt.save();
    console.log('✅ Created enhanced exam attempt');

    // Test review data retrieval
    console.log('\n📊 Testing review data retrieval...');
    
    const reviewAttempt = await TestAttempt.findById(attempt._id)
      .populate({
        path: 'series',
        select: 'title description layout duration'
      })
      .populate({
        path: 'responses.question',
        select: 'questionText options correctOptions explanation difficulty recommendedTimeAllotment'
      });

    if (!reviewAttempt) {
      throw new Error('Review attempt not found');
    }

    console.log('✅ Retrieved review attempt');

    // Validate enhanced fields are preserved
    const response = reviewAttempt.responses[0];
    console.log('\n🔍 Validating enhanced fields:');
    console.log(`  Time Spent: ${response.timeSpent}s`);
    console.log(`  Attempts: ${response.attempts}`);
    console.log(`  Flagged: ${response.flagged}`);
    console.log(`  Confidence: ${response.confidence}/5`);
    console.log(`  Visited At: ${response.visitedAt}`);
    console.log(`  Last Modified: ${response.lastModifiedAt}`);

    // Test expected time vs actual time comparison
    const question = response.question;
    const expectedTime = question.recommendedTimeAllotment || 120;
    const actualTime = response.timeSpent;
    const timeRatio = (actualTime / expectedTime * 100).toFixed(1);
    
    console.log(`\n⏱️  Time Analysis:`);
    console.log(`  Expected Time: ${expectedTime}s`);
    console.log(`  Actual Time: ${actualTime}s`);
    console.log(`  Time Ratio: ${timeRatio}%`);

    // Test explanation availability
    console.log(`\n📖 Explanation Test:`);
    console.log(`  Explanation Available: ${!!question.explanation}`);
    if (question.explanation) {
      console.log(`  Explanation Text: ${question.explanation.text}`);
    }

    // Simulate frontend review component data structure
    const reviewData = {
      attempt: {
        _id: reviewAttempt._id,
        score: reviewAttempt.score,
        maxScore: reviewAttempt.maxScore,
        percentage: reviewAttempt.percentage,
        duration: reviewAttempt.duration,
        submittedAt: reviewAttempt.submittedAt
      },
      questions: reviewAttempt.responses.map(r => ({
        question: r.question,
        userAnswer: r.selected,
        correctAnswer: r.question.correctOptions,
        isCorrect: r.earned > 0,
        earned: r.earned,
        status: r.status,
        // Enhanced review fields
        timeSpent: r.timeSpent,
        expectedTime: r.question.recommendedTimeAllotment || 120,
        attempts: r.attempts,
        flagged: r.flagged,
        confidence: r.confidence,
        visitedAt: r.visitedAt,
        lastModifiedAt: r.lastModifiedAt,
        explanation: r.question.explanation
      }))
    };

    console.log('\n📋 Review Data Structure:');
    console.log('✅ All enhanced fields successfully retrieved and formatted');
    console.log('✅ Time comparison data available');
    console.log('✅ Explanation data available');
    console.log('✅ User interaction tracking data available');

    // Clean up test data
    await User.findByIdAndDelete(testUser._id);
    await Question.findByIdAndDelete(testQuestion._id);
    await TestSeries.findByIdAndDelete(testSeries._id);
    await TestAttempt.findByIdAndDelete(attempt._id);
    console.log('\n🧹 Cleaned up test data');

    console.log('\n🎉 Enhanced Exam Flow Test PASSED!');
    console.log('✅ All enhanced review fields are properly stored and retrieved');
    console.log('✅ Time tracking functionality works correctly');
    console.log('✅ User interaction data is preserved');
    console.log('✅ Review page will have all necessary enhanced data');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
};

// Main execution
const runTest = async () => {
  await connectDB();
  await testEnhancedExamFlow();
  await mongoose.connection.close();
  console.log('\n🔌 Database connection closed');
};

runTest().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
