const mongoose = require('mongoose');
require('./config/db'); // This should connect to the database

const TestSeries = require('./models/TestSeries');

async function checkSeries() {
  try {
    console.log('Connecting to database...');
    console.log('MongoDB connection state:', mongoose.connection.readyState);
    
    const series = await TestSeries.find().select('title sections').lean();
    console.log('Test Series found:', series.length);
    
    if (series.length === 0) {
      console.log('No test series found in database');
    } else {
      series.forEach(s => {
        console.log(`- ${s.title}: ${s.sections?.length || 0} sections`);
        s.sections?.forEach((sec, idx) => {
          console.log(`  Section ${idx+1}: ${sec.title} - ${sec.questions?.length || 0} questions`);
        });
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSeries();
