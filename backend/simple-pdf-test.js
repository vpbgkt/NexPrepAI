const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

console.log('🔄 Starting Enhanced PDF Generation Test...');

try {
  // Create PDF document
  const doc = new PDFDocument({ 
    margin: 40, 
    size: 'A4',
    info: {
      Title: 'NexPrep Performance Scorecard - Demo',
      Author: 'NexPrep Platform',
      Subject: 'Exam Performance Analysis'
    }
  });

  // Create output stream
  const outputPath = path.join(__dirname, 'nexprep-enhanced-demo.pdf');
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  console.log('📄 Generating enhanced PDF content...');

  // Header with branding
  const pageWidth = doc.page.width - 80;
  doc.rect(40, 40, pageWidth, 60)
     .fillAndStroke('#1565c0', '#1565c0');

  doc.fontSize(24)
     .fillColor('white')
     .text('NexPrep', 60, 60);

  doc.fontSize(14)
     .text('Enhanced Performance Scorecard', 60, 85);

  doc.fontSize(10)
     .fillColor('white')
     .text(new Date().toLocaleDateString(), pageWidth - 40, 75, { align: 'right' });

  // Reset to black and move down
  doc.fillColor('black').fontSize(12);
  doc.y = 140;

  // Student Information Card
  doc.rect(50, 140, 150, 130).fillAndStroke('#f8f9fa', '#e9ecef');
  doc.fillColor('#1565c0').fontSize(12).text('Student Information', 60, 150, { width: 130, align: 'center' });
  doc.fillColor('black').fontSize(10);
  doc.text('Name: John Doe', 60, 175);
  doc.text('Email: john.doe@example.com', 60, 190);
  doc.text('Exam: JEE Main Mock Test', 60, 205);
  doc.text('Attempt #: 1', 60, 220);
  doc.text('Date: ' + new Date().toLocaleDateString(), 60, 235);

  // Performance Card
  doc.rect(220, 140, 150, 130).fillAndStroke('#f8f9fa', '#e9ecef');
  doc.fillColor('#1565c0').fontSize(12).text('Overall Performance', 230, 150, { width: 130, align: 'center' });
  doc.fillColor('black').fontSize(10);
  doc.text('Score: 75/100', 230, 175);
  doc.text('Percentage: 75%', 230, 190);
  doc.text('Grade: B', 230, 205);
  doc.text('Time: 120 minutes', 230, 220);
  doc.text('Attempted: 95/100', 230, 235);

  // Key Metrics Card
  doc.rect(390, 140, 150, 130).fillAndStroke('#f8f9fa', '#e9ecef');
  doc.fillColor('#1565c0').fontSize(12).text('Key Metrics', 400, 150, { width: 130, align: 'center' });
  doc.fillColor('black').fontSize(10);
  doc.text('Accuracy: 75.0%', 400, 175);
  doc.text('Correct: 75', 400, 190);
  doc.text('Incorrect: 20', 400, 205);
  doc.text('Unanswered: 5', 400, 220);
  doc.text('Flagged: 8', 400, 235);

  // Performance Summary
  doc.y = 300;
  doc.fontSize(14).fillColor('#1565c0').text('Performance Summary', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor('black');
  doc.text('Your overall performance on JEE Main Mock Test shows 75.0% accuracy with significant improvement from your previous attempts. Good performance with room for improvement. Focus on the recommended areas to achieve even better results in your upcoming exams.', {
    width: 500,
    align: 'justify'
  });

  // Page 2: Detailed Analytics
  doc.addPage();
  doc.fontSize(18).fillColor('#1565c0').text('Detailed Performance Analytics', { align: 'center' });
  doc.moveDown();

  // Difficulty Analysis
  doc.fontSize(14).fillColor('#333').text('Performance by Difficulty Level');
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor('black');
  doc.text('Easy: 28/30 (93.3%)', { indent: 20 });
  doc.text('Medium: 35/50 (70.0%)', { indent: 20 });
  doc.text('Hard: 12/20 (60.0%)', { indent: 20 });

  doc.moveDown();

  // Subject Performance
  doc.fontSize(14).fillColor('#333').text('Performance by Subject');
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor('black');
  doc.text('Physics: 38/50 (76.0%) - Avg: 1.2min', { indent: 20 });
  doc.text('Chemistry: 37/50 (74.0%) - Avg: 1.2min', { indent: 20 });

  doc.moveDown();

  // Time Analysis
  doc.fontSize(14).fillColor('#333').text('Time Management Analysis');
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor('black');
  doc.text('Average time per question: 1.2 minutes', { indent: 20 });
  doc.text('Fastest question: 0.3 minutes', { indent: 20 });
  doc.text('Slowest question: 5.0 minutes', { indent: 20 });
  doc.text('Questions over time limit: 12', { indent: 20 });

  // Page 3: Recommendations
  doc.addPage();
  doc.fontSize(18).fillColor('#1565c0').text('Personalized Recommendations & Action Plan', { align: 'center' });
  doc.moveDown();

  // Study Recommendations
  doc.fontSize(14).fillColor('#333').text('📚 Study Recommendations');
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor('black');
  doc.text('• Review incorrect answers thoroughly to understand mistakes', { indent: 20, width: 500 });
  doc.text('• Practice time management with timed question sets', { indent: 20, width: 500 });
  doc.text('• Create a daily study schedule with regular practice sessions', { indent: 20, width: 500 });
  doc.text('• Use active recall and spaced repetition techniques', { indent: 20, width: 500 });

  doc.moveDown();

  // Action Plan
  doc.fontSize(14).fillColor('#333').text('🎯 Suggested Action Plan');
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor('black');
  doc.text('1. Review all flagged and incorrect questions from this attempt', { indent: 20, width: 500 });
  doc.text('2. Identify and study the top 3 weakest subject areas', { indent: 20, width: 500 });
  doc.text('3. Spend 1-2 hours daily on targeted practice', { indent: 20, width: 500 });
  doc.text('4. Take practice tests weekly to track improvement', { indent: 20, width: 500 });

  doc.moveDown();

  // Motivational Message
  doc.fontSize(14).fillColor('#4CAF50').text('💪 Keep Going!', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor('black');
  doc.text('Great job! You\'re showing strong progress. A little more focus on weak areas will get you to the top!', { align: 'center', width: 500 });

  // Add footer to all pages
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    
    // Footer line
    doc.moveTo(40, doc.page.height - 60)
       .lineTo(doc.page.width - 40, doc.page.height - 60)
       .stroke('#e0e0e0');
    
    // Footer text
    doc.fontSize(8).fillColor('#666');
    doc.text('Generated by NexPrep - Your Personal Exam Preparation Platform', 
             40, doc.page.height - 50, { align: 'center' });
    
    // Page number
    doc.text(`Page ${i + 1} of ${pages.count}`, 
             40, doc.page.height - 35, { align: 'center' });
  }

  doc.end();

  stream.on('finish', () => {
    console.log('✅ Enhanced PDF generated successfully!');
    console.log(`📁 File saved as: ${outputPath}`);
    console.log('📊 PDF includes:');
    console.log('   ✨ Professional header with NexPrep branding');
    console.log('   📋 Executive summary with key performance metrics');
    console.log('   📈 Detailed analytics by difficulty and subject');
    console.log('   🎯 Personalized recommendations and action plans');
    console.log('   📄 Multi-page professional layout with footers');
    console.log('   💡 Performance insights and motivational content');
    console.log('');
    console.log('🎉 Phase 4: PDF Scorecard Enhancement - COMPLETED SUCCESSFULLY!');
  });

  stream.on('error', (error) => {
    console.error('❌ Error writing PDF:', error);
  });

} catch (error) {
  console.error('❌ Error generating enhanced PDF:', error);
}
