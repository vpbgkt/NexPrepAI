/**
 * API-based Sample Data Creator for NexPrep Enrollment System
 * This script creates sample exam families, levels, and branches via API calls
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Sample data
const sampleData = {
  examFamilies: [
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
  ],
  examLevels: [
    {
      name: 'JEE Main',
      code: 'JEE_MAIN',
      description: 'First stage of JEE examination',
      familyCode: 'JEE',
      isActive: true
    },
    {
      name: 'JEE Advanced',
      code: 'JEE_ADVANCED',
      description: 'Second stage of JEE examination for IIT admission',
      familyCode: 'JEE',
      isActive: true
    },
    {
      name: 'NEET UG',
      code: 'NEET_UG',
      description: 'Undergraduate medical entrance exam',
      familyCode: 'NEET',
      isActive: true
    },
    {
      name: 'NEET PG',
      code: 'NEET_PG',
      description: 'Postgraduate medical entrance exam',
      familyCode: 'NEET',
      isActive: true
    },
    {
      name: 'GATE',
      code: 'GATE_GENERAL',
      description: 'Graduate Aptitude Test in Engineering',
      familyCode: 'GATE',
      isActive: true
    },
    {
      name: 'CAT',
      code: 'CAT_GENERAL',
      description: 'Common Aptitude Test',
      familyCode: 'CAT',
      isActive: true
    }
  ],
  branches: [
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
  ]
};

async function createSampleData() {
  try {
    console.log('Creating sample enrollment data via API...');
    
    // Note: This would require admin endpoints to be implemented
    // For now, we'll just log the data that should be created
    
    console.log('\n=== SAMPLE DATA TO CREATE ===');
    console.log('\nExam Families:');
    sampleData.examFamilies.forEach(family => {
      console.log(`- ${family.name} (${family.code}): ${family.description}`);
    });
    
    console.log('\nExam Levels:');
    sampleData.examLevels.forEach(level => {
      console.log(`- ${level.name} (${level.code}) for ${level.familyCode}`);
    });
    
    console.log('\nBranches:');
    sampleData.branches.forEach(branch => {
      console.log(`- ${branch.name} (${branch.code}): ${branch.description}`);
    });
    
    console.log('\n=== MANUAL DATABASE INSERTION REQUIRED ===');
    console.log('Since admin endpoints for creating exam families/levels/branches are not yet implemented,');
    console.log('you can manually insert this data into MongoDB using:');
    console.log('1. MongoDB Compass');
    console.log('2. MongoDB shell');
    console.log('3. Direct database connection');
    
    console.log('\n=== MONGODB SHELL COMMANDS ===');
    console.log('use nexprep');
    console.log('\n// Insert exam families');
    console.log('db.examfamilies.insertMany(' + JSON.stringify(sampleData.examFamilies, null, 2) + ');');
    
    console.log('\n// Note: For exam levels, you need to replace familyCode with actual family _id');
    console.log('// Get family IDs first: db.examfamilies.find({}, {_id: 1, code: 1})');
    console.log('// Then update exam levels with correct family ObjectIds');
    
    console.log('\n// Insert branches');
    console.log('db.branches.insertMany(' + JSON.stringify(sampleData.branches, null, 2) + ');');
    
  } catch (error) {
    console.error('Error creating sample data:', error.message);
  }
}

// Alternative: Generate MongoDB-ready insertion script
function generateMongoScript() {
  const script = `
// NexPrep Enrollment System - Sample Data Insertion Script
// Run this in MongoDB shell after connecting to your database

use nexprep

// Insert Exam Families
db.examfamilies.insertMany(${JSON.stringify(sampleData.examFamilies, null, 2)});

// Get family IDs for reference
var families = {};
db.examfamilies.find().forEach(function(family) {
  families[family.code] = family._id;
});

// Insert Exam Levels with family references
db.examlevels.insertMany([
  {
    name: 'JEE Main',
    code: 'JEE_MAIN',
    description: 'First stage of JEE examination',
    family: families['JEE'],
    isActive: true
  },
  {
    name: 'JEE Advanced',
    code: 'JEE_ADVANCED',
    description: 'Second stage of JEE examination for IIT admission',
    family: families['JEE'],
    isActive: true
  },
  {
    name: 'NEET UG',
    code: 'NEET_UG',
    description: 'Undergraduate medical entrance exam',
    family: families['NEET'],
    isActive: true
  },
  {
    name: 'NEET PG',
    code: 'NEET_PG',
    description: 'Postgraduate medical entrance exam',
    family: families['NEET'],
    isActive: true
  },
  {
    name: 'GATE',
    code: 'GATE_GENERAL',
    description: 'Graduate Aptitude Test in Engineering',
    family: families['GATE'],
    isActive: true
  },
  {
    name: 'CAT',
    code: 'CAT_GENERAL',
    description: 'Common Aptitude Test',
    family: families['CAT'],
    isActive: true
  }
]);

// Insert Branches
db.branches.insertMany(${JSON.stringify(sampleData.branches, null, 2)});

print("Sample data inserted successfully!");
print("Exam Families: " + db.examfamilies.count());
print("Exam Levels: " + db.examlevels.count());
print("Branches: " + db.branches.count());
`;
  
  return script;
}

// Run the sample data creator
createSampleData();

// Also generate a MongoDB script file
const fs = require('fs');
const mongoScript = generateMongoScript();
fs.writeFileSync('mongo-sample-data.js', mongoScript);
console.log('\n=== GENERATED MONGODB SCRIPT ===');
console.log('A MongoDB script file "mongo-sample-data.js" has been created.');
console.log('You can run it with: mongo < mongo-sample-data.js');
console.log('Or copy-paste the commands into MongoDB shell.');
