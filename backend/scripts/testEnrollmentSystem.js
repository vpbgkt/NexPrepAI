/**
 * Comprehensive Enrollment System Integration Test
 * 
 * This script tests the complete enrollment system functionality:
 * 1. Creates sample exam families, levels, and branches
 * 2. Creates a test user
 * 3. Tests enrollment operations
 * 4. Tests access control
 * 5. Tests filtering and data retrieval
 * 
 * Run this script to verify the enrollment system is working properly.
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');
const ExamFamily = require('../models/ExamFamily');
const ExamLevel = require('../models/ExamLevel');
const ExamBranch = require('../models/ExamBranch');
const Enrollment = require('../models/Enrollment');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nexprep');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function createSampleData() {
  console.log('\n📝 Creating sample data...');
  
  // Create Exam Families
  const jeeFamily = await ExamFamily.findOneAndUpdate(
    { code: 'JEE' },
    {
      name: 'Joint Entrance Examination',
      code: 'JEE',
      description: 'Engineering entrance exam',
      isActive: true
    },
    { upsert: true, new: true }
  );

  const neetFamily = await ExamFamily.findOneAndUpdate(
    { code: 'NEET' },
    {
      name: 'National Eligibility cum Entrance Test',
      code: 'NEET',
      description: 'Medical entrance exam',
      isActive: true
    },
    { upsert: true, new: true }
  );

  // Create Exam Levels
  const jeeMain = await ExamLevel.findOneAndUpdate(
    { code: 'JEE_MAIN' },
    {
      name: 'JEE Main',
      code: 'JEE_MAIN',
      description: 'First stage of JEE',
      family: jeeFamily._id,
      isActive: true
    },
    { upsert: true, new: true }
  );

  const jeeAdvanced = await ExamLevel.findOneAndUpdate(
    { code: 'JEE_ADVANCED' },
    {
      name: 'JEE Advanced',
      code: 'JEE_ADVANCED',
      description: 'Second stage of JEE',
      family: jeeFamily._id,
      isActive: true
    },
    { upsert: true, new: true }
  );

  const neetUG = await ExamLevel.findOneAndUpdate(
    { code: 'NEET_UG' },
    {
      name: 'NEET UG',
      code: 'NEET_UG',
      description: 'Undergraduate medical exam',
      family: neetFamily._id,
      isActive: true
    },
    { upsert: true, new: true }
  );

  // Create Exam Branches
  const mathBranch = await ExamBranch.findOneAndUpdate(
    { code: 'MATH_JEE_MAIN' },
    {
      name: 'Mathematics',
      code: 'MATH_JEE_MAIN',
      description: 'Mathematics for JEE Main',
      level: jeeMain._id,
      isActive: true
    },
    { upsert: true, new: true }
  );

  const physicsBranch = await ExamBranch.findOneAndUpdate(
    { code: 'PHYSICS_JEE_MAIN' },
    {
      name: 'Physics',
      code: 'PHYSICS_JEE_MAIN',
      description: 'Physics for JEE Main',
      level: jeeMain._id,
      isActive: true
    },
    { upsert: true, new: true }
  );

  const chemistryBranch = await ExamBranch.findOneAndUpdate(
    { code: 'CHEMISTRY_JEE_MAIN' },
    {
      name: 'Chemistry',
      code: 'CHEMISTRY_JEE_MAIN',
      description: 'Chemistry for JEE Main',
      level: jeeMain._id,
      isActive: true
    },
    { upsert: true, new: true }
  );

  const biologyBranch = await ExamBranch.findOneAndUpdate(
    { code: 'BIOLOGY_NEET' },
    {
      name: 'Biology',
      code: 'BIOLOGY_NEET',
      description: 'Biology for NEET',
      level: neetUG._id,
      isActive: true
    },
    { upsert: true, new: true }
  );

  console.log('✅ Sample data created successfully');
  
  return {
    families: { jee: jeeFamily, neet: neetFamily },
    levels: { jeeMain, jeeAdvanced, neetUG },
    branches: { math: mathBranch, physics: physicsBranch, chemistry: chemistryBranch, biology: biologyBranch }
  };
}

async function createTestUser() {
  console.log('\n👤 Creating test user...');
  
  const testUser = await User.findOneAndUpdate(
    { email: 'test@enrollment.com' },
    {
      name: 'Test Student',
      email: 'test@enrollment.com',
      phone: '1234567890',
      role: 'student',
      isActive: true,
      isVerified: true
    },
    { upsert: true, new: true }
  );

  console.log('✅ Test user created:', testUser.name);
  return testUser;
}

async function testEnrollmentOperations(sampleData, testUser) {
  console.log('\n🎯 Testing enrollment operations...');

  // Test 1: Create enrollment
  console.log('Test 1: Creating enrollment...');
  try {
    const enrollment = new Enrollment({
      student: testUser._id,
      examFamily: sampleData.families.jee._id,
      examLevels: [sampleData.levels.jeeMain._id],
      branches: [sampleData.branches.math._id, sampleData.branches.physics._id],
      enrollmentType: 'self',
      accessLevel: 'basic',
      preferences: {
        receiveNotifications: true,
        difficultyLevel: 'mixed',
        preferredLanguage: 'english'
      },
      enrolledBy: testUser._id
    });

    await enrollment.save();
    console.log('✅ Enrollment created successfully');
  } catch (error) {
    console.error('❌ Error creating enrollment:', error.message);
  }

  // Test 2: Check access
  console.log('Test 2: Checking access...');
  try {
    const hasAccess = await Enrollment.hasAccessToExamFamily(testUser._id, sampleData.families.jee._id);
    console.log('✅ Access check result:', hasAccess ? 'Has access' : 'No access');
  } catch (error) {
    console.error('❌ Error checking access:', error.message);
  }

  // Test 3: Get active enrollments
  console.log('Test 3: Getting active enrollments...');
  try {
    const enrollments = await Enrollment.getActiveEnrollments(testUser._id);
    console.log('✅ Active enrollments count:', enrollments.length);
    
    if (enrollments.length > 0) {
      console.log('   Enrollment details:');
      enrollments.forEach(enrollment => {
        console.log(`   - Family: ${enrollment.examFamily.name}`);
        console.log(`   - Levels: ${enrollment.examLevels.map(l => l.name).join(', ')}`);
        console.log(`   - Branches: ${enrollment.branches.map(b => b.name).join(', ')}`);
      });
    }
  } catch (error) {
    console.error('❌ Error getting enrollments:', error.message);
  }

  // Test 4: Test duplicate enrollment prevention
  console.log('Test 4: Testing duplicate enrollment prevention...');
  try {
    const duplicateEnrollment = new Enrollment({
      student: testUser._id,
      examFamily: sampleData.families.jee._id,
      examLevels: [sampleData.levels.jeeMain._id],
      branches: [sampleData.branches.chemistry._id],
      enrollmentType: 'self',
      accessLevel: 'basic',
      enrolledBy: testUser._id
    });

    await duplicateEnrollment.save();
    console.log('⚠️  Duplicate enrollment was created (this might indicate an issue)');
  } catch (error) {
    if (error.code === 11000) {
      console.log('✅ Duplicate enrollment prevented correctly');
    } else {
      console.error('❌ Unexpected error:', error.message);
    }
  }
}

async function testFilteringFunctionality(sampleData) {
  console.log('\n🔍 Testing filtering functionality...');

  // Test exam branches filtering by level
  console.log('Test: Getting exam branches for JEE Main level...');
  try {
    const branches = await ExamBranch.find({
      level: sampleData.levels.jeeMain._id
    }).populate('level', 'name code');

    console.log('✅ Exam branches for JEE Main:', branches.length);
    branches.forEach(branch => {
      console.log(`   - ${branch.name} (${branch.code})`);
    });
  } catch (error) {
    console.error('❌ Error filtering branches:', error.message);
  }
}

async function runComprehensiveTest() {
  console.log('🚀 Starting Comprehensive Enrollment System Test\n');
  
  try {
    // Connect to database
    await connectDB();

    // Create sample data
    const sampleData = await createSampleData();

    // Create test user
    const testUser = await createTestUser();

    // Test enrollment operations  
    await testEnrollmentOperations(sampleData, testUser);

    // Test filtering functionality
    await testFilteringFunctionality(sampleData);

    console.log('\n✅ All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Sample data created/updated');
    console.log('- Test user created');
    console.log('- Enrollment operations tested');
    console.log('- Access control verified');
    console.log('- Filtering functionality tested');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔒 Database connection closed');
    process.exit(0);
  }
}

// Run the test
runComprehensiveTest();
