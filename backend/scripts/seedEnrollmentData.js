/**
 * Sample Data Seeder for NexPrep Enrollment System
 * Run this script to populate the database with sample exam families, levels, and branches
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const ExamFamily = require('../models/ExamFamily');
const ExamLevel = require('../models/ExamLevel');
const Branch = require('../models/Branch');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nexprep')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function seedData() {
  try {
    // Clear existing data
    await ExamFamily.deleteMany({});
    await ExamLevel.deleteMany({});
    await Branch.deleteMany({});

    // Create Exam Families
    const examFamilies = await ExamFamily.insertMany([
      {
        name: 'Joint Entrance Examination',
        code: 'JEE',
        description: 'Engineering entrance exam for IITs, NITs, and other premier institutes',
        isActive: true
      },
      {
        name: 'National Eligibility cum Entrance Test',
        code: 'NEET',
        description: 'Medical entrance exam for MBBS, BDS, and other medical courses',
        isActive: true
      },
      {
        name: 'Graduate Aptitude Test in Engineering',
        code: 'GATE',
        description: 'Graduate level engineering entrance exam',
        isActive: true
      },
      {
        name: 'Common Aptitude Test',
        code: 'CAT',
        description: 'Management entrance exam for IIMs and other B-schools',
        isActive: true
      }
    ]);

    // Create Exam Levels
    const jeeFamily = examFamilies.find(f => f.code === 'JEE');
    const neetFamily = examFamilies.find(f => f.code === 'NEET');
    const gateFamily = examFamilies.find(f => f.code === 'GATE');
    const catFamily = examFamilies.find(f => f.code === 'CAT');

    const examLevels = await ExamLevel.insertMany([
      // JEE Levels
      {
        name: 'JEE Main',
        code: 'JEE_MAIN',
        description: 'First stage of JEE examination',
        family: jeeFamily._id,
        isActive: true
      },
      {
        name: 'JEE Advanced',
        code: 'JEE_ADVANCED',
        description: 'Second stage of JEE examination for IIT admission',
        family: jeeFamily._id,
        isActive: true
      },
      // NEET Levels
      {
        name: 'NEET UG',
        code: 'NEET_UG',
        description: 'Undergraduate medical entrance exam',
        family: neetFamily._id,
        isActive: true
      },
      {
        name: 'NEET PG',
        code: 'NEET_PG',
        description: 'Postgraduate medical entrance exam',
        family: neetFamily._id,
        isActive: true
      },
      // GATE Levels
      {
        name: 'GATE',
        code: 'GATE_GENERAL',
        description: 'Graduate Aptitude Test in Engineering',
        family: gateFamily._id,
        isActive: true
      },
      // CAT Levels
      {
        name: 'CAT',
        code: 'CAT_GENERAL',
        description: 'Common Aptitude Test',
        family: catFamily._id,
        isActive: true
      }
    ]);

    // Create Branches
    const branches = await Branch.insertMany([
      // Engineering Branches
      {
        name: 'Physics, Chemistry, Mathematics',
        code: 'PCM',
        description: 'Core subjects for engineering entrance',
        isActive: true
      },
      {
        name: 'Physics, Chemistry, Biology',
        code: 'PCB',
        description: 'Core subjects for medical entrance',
        isActive: true
      },
      {
        name: 'Computer Science',
        code: 'CS',
        description: 'Computer Science and Information Technology',
        isActive: true
      },
      {
        name: 'Mechanical Engineering',
        code: 'ME',
        description: 'Mechanical Engineering branch',
        isActive: true
      },
      {
        name: 'Electrical Engineering',
        code: 'EE',
        description: 'Electrical and Electronics Engineering',
        isActive: true
      },
      {
        name: 'Civil Engineering',
        code: 'CE',
        description: 'Civil Engineering branch',
        isActive: true
      },
      // Management Branches
      {
        name: 'General Management',
        code: 'GM',
        description: 'General Management and MBA',
        isActive: true
      },
      {
        name: 'Quantitative Aptitude',
        code: 'QA',
        description: 'Quantitative Aptitude and Mathematics',
        isActive: true
      },
      {
        name: 'Verbal Ability',
        code: 'VA',
        description: 'Verbal Ability and Reading Comprehension',
        isActive: true
      },
      {
        name: 'Logical Reasoning',
        code: 'LR',
        description: 'Logical Reasoning and Critical Thinking',
        isActive: true
      }
    ]);

    console.log('Sample data seeded successfully!');
    console.log(`Created ${examFamilies.length} exam families`);
    console.log(`Created ${examLevels.length} exam levels`);
    console.log(`Created ${branches.length} branches`);

    // Display created data
    console.log('\nExam Families:');
    examFamilies.forEach(family => {
      console.log(`- ${family.name} (${family.code})`);
    });

    console.log('\nExam Levels:');
    examLevels.forEach(level => {
      console.log(`- ${level.name} (${level.code})`);
    });

    console.log('\nBranches:');
    branches.forEach(branch => {
      console.log(`- ${branch.name} (${branch.code})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

// Run the seeder
seedData();
