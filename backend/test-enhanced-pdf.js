const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

// Mock data for testing enhanced PDF generation
const mockAttemptData = {
  attempt: {
    _id: 'test_attempt_id',
    student: {
      username: 'john_doe',
      email: 'john.doe@example.com'
    },
    series: {
      title: 'JEE Main Mock Test - Physics & Chemistry',
      examType: 'JEE Main',
      description: 'Comprehensive test covering mechanics and organic chemistry'
    },
    attemptNo: 1,
    score: 75,
    maxScore: 100,
    percentage: 75,
    submittedAt: new Date(),
    totalTimeSpent: 7200 // 2 hours in seconds
  },
  performanceAnalytics: {
    overall: {
      totalQuestions: 100,
      correctAnswers: 75,
      incorrectAnswers: 20,
      unanswered: 5,
      accuracy: 75.0,
      timeSpent: 7200,
      averageTimePerQuestion: 72,
      flaggedCount: 8
    },
    difficultyBreakdown: {
      Easy: { total: 30, correct: 28 },
      Medium: { total: 50, correct: 35 },
      Hard: { total: 20, correct: 12 }
    },
    subjectPerformance: {
      Physics: { total: 50, correct: 38, timeSpent: 3600 },
      Chemistry: { total: 50, correct: 37, timeSpent: 3600 }
    },
    timeAnalysis: {
      fastestQuestion: 15,
      slowestQuestion: 300,
      questionsOverTime: 12
    }
  },
  comparativeAnalytics: {
    currentScore: 75,
    averageScore: 68.5,
    improvement: 6.5,
    totalAttempts: 3,
    rank: 1,
    trend: 'improving'
  },
  weaknessAnalysis: {
    weakTopics: ['Organic Chemistry', 'Thermodynamics'],
    recommendedStudyTime: 120,
    focusAreas: ['Time Management', 'Accuracy'],
    nextSteps: [
      'Review flagged questions',
      'Practice similar difficulty questions',
      'Focus on time management'
    ]
  },
  questions: [
    {
      _id: 'q1',
      isCorrect: true,
      timeSpent: 45,
      difficulty: 'Easy',
      status: 'answered',
      flagged: false,
      topics: { subject: 'Physics' }
    },
    {
      _id: 'q2',
      isCorrect: false,
      timeSpent: 120,
      difficulty: 'Medium',
      status: 'answered',
      flagged: true,
      topics: { subject: 'Chemistry' }
    }
  ]
};

async function testEnhancedPdfGeneration() {
  console.log('🔄 Starting Enhanced PDF Generation Test...');
  
  try {
    // Create PDF document
    const doc = new PDFDocument({ 
      margin: 40, 
      size: 'A4',
      info: {
        Title: 'NexPrep Performance Scorecard - Test',
        Author: 'NexPrep Platform',
        Subject: 'Exam Performance Analysis'
      }
    });

    // Create output stream
    const outputPath = path.join(__dirname, 'test-enhanced-scorecard.pdf');
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    console.log('📄 Generating PDF content...');

    // Generate the enhanced PDF content
    await generateEnhancedPdfContent(doc, mockAttemptData);

    doc.end();

    // Wait for PDF to finish writing
    await new Promise((resolve) => {
      stream.on('finish', resolve);
    });

    console.log('✅ Enhanced PDF generated successfully!');
    console.log(`📁 File saved as: ${outputPath}`);
    console.log('📊 PDF includes:');
    console.log('   - Professional header with branding');
    console.log('   - Executive summary with key metrics');
    console.log('   - Detailed performance analytics');
    console.log('   - Interactive-style charts and visualizations');
    console.log('   - Personalized recommendations and action plans');
    console.log('   - Multi-page professional layout');

  } catch (error) {
    console.error('❌ Error generating enhanced PDF:', error);
    throw error;
  }
}

async function generateEnhancedPdfContent(doc, data) {
  const { attempt, performanceAnalytics, comparativeAnalytics, weaknessAnalysis, questions } = data;
  
  // Add header and branding
  await addPdfHeader(doc, attempt);
  
  // Page 1: Executive Summary
  await addExecutiveSummary(doc, attempt, performanceAnalytics, comparativeAnalytics);
  addPdfFooter(doc);
  
  // Page 2: Detailed Analytics
  doc.addPage();
  await addDetailedAnalytics(doc, performanceAnalytics, questions);
  addPdfFooter(doc);
  
  // Page 3: Performance Charts
  doc.addPage();
  await addPerformanceCharts(doc, performanceAnalytics, comparativeAnalytics);
  addPdfFooter(doc);
  
  // Page 4: Recommendations & Action Plan
  doc.addPage();
  await addRecommendationsPage(doc, weaknessAnalysis, performanceAnalytics);
  addPdfFooter(doc);
}

async function addPdfHeader(doc, attempt) {
  const pageWidth = doc.page.width - 80;
  
  // Header background
  doc.rect(40, 40, pageWidth, 60)
     .fillAndStroke('#1565c0', '#1565c0');
  
  // NexPrep Logo/Title
  doc.fontSize(24)
     .fillColor('white')
     .text('NexPrep', 60, 60, { align: 'left' });
  
  doc.fontSize(14)
     .text('Performance Scorecard', 60, 85, { align: 'left' });
  
  // Date
  doc.fontSize(10)
     .text(new Date().toLocaleDateString('en-US', { 
       year: 'numeric', 
       month: 'long', 
       day: 'numeric' 
     }), pageWidth - 40, 75, { align: 'right' });
  
  doc.fillColor('black');
  doc.moveDown(3);
}

async function addExecutiveSummary(doc, attempt, performanceAnalytics, comparativeAnalytics) {
  const startY = 140;
  doc.y = startY;
  
  // Student Information Card
  addCard(doc, 'Student Information', startY, 50, [
    `Name: ${attempt.student.username}`,
    `Email: ${attempt.student.email}`,
    `Exam: ${attempt.series.title}`,
    `Attempt #: ${attempt.attemptNo}`,
    `Date: ${new Date(attempt.submittedAt).toLocaleDateString()}`
  ]);
  
  // Overall Score Card
  addCard(doc, 'Overall Performance', startY, 220, [
    `Score: ${attempt.score}/${attempt.maxScore}`,
    `Percentage: ${attempt.percentage}%`,
    `Grade: ${getGrade(attempt.percentage)}`,
    `Time Spent: ${Math.round(performanceAnalytics.overall.timeSpent / 60)} minutes`,
    `Questions Attempted: ${performanceAnalytics.overall.totalQuestions - performanceAnalytics.overall.unanswered}`
  ]);
  
  // Performance Metrics
  addCard(doc, 'Key Metrics', startY, 390, [
    `Accuracy: ${performanceAnalytics.overall.accuracy.toFixed(1)}%`,
    `Correct: ${performanceAnalytics.overall.correctAnswers}`,
    `Incorrect: ${performanceAnalytics.overall.incorrectAnswers}`,
    `Unanswered: ${performanceAnalytics.overall.unanswered}`,
    `Flagged: ${performanceAnalytics.overall.flaggedCount}`
  ]);
  
  // Performance Summary
  doc.y = startY + 200;
  doc.fontSize(14)
     .fillColor('#1565c0')
     .text('Performance Summary', { underline: true });
  
  doc.moveDown(0.5);
  doc.fontSize(12)
     .fillColor('black')
     .text(generatePerformanceSummary(attempt, performanceAnalytics, comparativeAnalytics), {
       width: 500,
       align: 'justify'
     });
}

async function addDetailedAnalytics(doc, performanceAnalytics, questions) {
  doc.fontSize(18)
     .fillColor('#1565c0')
     .text('Detailed Performance Analytics', { align: 'center' });
  
  doc.moveDown();
  
  // Difficulty Analysis
  doc.fontSize(14)
     .fillColor('#333')
     .text('Performance by Difficulty Level');
  
  doc.moveDown(0.5);
  
  Object.entries(performanceAnalytics.difficultyBreakdown).forEach(([difficulty, stats]) => {
    if (stats.total > 0) {
      const accuracy = ((stats.correct / stats.total) * 100).toFixed(1);
      doc.fontSize(12)
         .fillColor('black')
         .text(`${difficulty}: ${stats.correct}/${stats.total} (${accuracy}%)`, { indent: 20 });
    }
  });
  
  doc.moveDown();
  
  // Subject Performance
  doc.fontSize(14)
     .fillColor('#333')
     .text('Performance by Subject');
  
  doc.moveDown(0.5);
  
  Object.entries(performanceAnalytics.subjectPerformance).forEach(([subject, stats]) => {
    const accuracy = ((stats.correct / stats.total) * 100).toFixed(1);
    const avgTime = (stats.timeSpent / stats.total / 60).toFixed(1);
    doc.fontSize(12)
       .fillColor('black')
       .text(`${subject}: ${stats.correct}/${stats.total} (${accuracy}%) - Avg: ${avgTime}min`, { indent: 20 });
  });
}

async function addPerformanceCharts(doc, performanceAnalytics, comparativeAnalytics) {
  doc.fontSize(18)
     .fillColor('#1565c0')
     .text('Performance Visualizations', { align: 'center' });
  
  doc.moveDown();
  
  try {
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ 
      width: 400, 
      height: 250,
      backgroundColour: 'white'
    });
    
    // Pie Chart
    const pieChartConfig = {
      type: 'pie',
      data: {
        labels: ['Correct', 'Incorrect', 'Unanswered'],
        datasets: [{
          data: [
            performanceAnalytics.overall.correctAnswers,
            performanceAnalytics.overall.incorrectAnswers,
            performanceAnalytics.overall.unanswered
          ],
          backgroundColor: ['#4CAF50', '#F44336', '#FF9800'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Answer Distribution',
            font: { size: 16 }
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    };
    
    const pieChartBuffer = await chartJSNodeCanvas.renderToBuffer(pieChartConfig);
    doc.image(pieChartBuffer, 100, doc.y, { width: 200 });
    
    console.log('📊 Charts generated successfully');
    
  } catch (chartError) {
    console.log('⚠️  Chart generation skipped (dependency issue)');
    doc.fontSize(12)
       .fillColor('#666')
       .text('Charts require canvas dependencies. Install with: npm install canvas', { align: 'center' });
  }
}

async function addRecommendationsPage(doc, weaknessAnalysis, performanceAnalytics) {
  doc.fontSize(18)
     .fillColor('#1565c0')
     .text('Personalized Recommendations & Action Plan', { align: 'center' });
  
  doc.moveDown();
  
  // Study Recommendations
  doc.fontSize(14)
     .fillColor('#333')
     .text('📚 Study Recommendations');
  
  doc.moveDown(0.5);
  
  const recommendations = generateStudyRecommendations(performanceAnalytics, weaknessAnalysis);
  recommendations.forEach(rec => {
    doc.fontSize(12)
       .fillColor('black')
       .text(`• ${rec}`, { indent: 20, width: 500 });
  });
  
  doc.moveDown();
  
  // Motivational Message
  doc.fontSize(14)
     .fillColor('#4CAF50')
     .text('💪 Keep Going!', { align: 'center' });
  
  doc.moveDown(0.5);
  
  const motivationalMessage = getMotivationalMessage(performanceAnalytics.overall.accuracy);
  doc.fontSize(12)
     .fillColor('black')
     .text(motivationalMessage, { align: 'center', width: 500 });
}

function addCard(doc, title, y, x, items) {
  const cardWidth = 140;
  const cardHeight = 140;
  
  // Card background
  doc.rect(x, y, cardWidth, cardHeight)
     .fillAndStroke('#f8f9fa', '#e9ecef');
  
  // Card title
  doc.fontSize(12)
     .fillColor('#1565c0')
     .text(title, x + 10, y + 10, { width: cardWidth - 20, align: 'center' });
  
  // Card content
  doc.fontSize(10)
     .fillColor('black');
  
  items.forEach((item, index) => {
    doc.text(item, x + 10, y + 35 + (index * 18), { width: cardWidth - 20 });
  });
}

function addPdfFooter(doc) {
  // Add footer to current page only
  // Footer line
  doc.moveTo(40, doc.page.height - 60)
     .lineTo(doc.page.width - 40, doc.page.height - 60)
     .stroke('#e0e0e0');
  
  // Footer text
  doc.fontSize(8)
     .fillColor('#666')
     .text('Generated by NexPrep - Your Personal Exam Preparation Platform', 
           40, doc.page.height - 50, { align: 'center' });
}

// Helper functions
function getGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}

function generatePerformanceSummary(attempt, performanceAnalytics, comparativeAnalytics) {
  const accuracy = performanceAnalytics.overall.accuracy;
  const improvement = comparativeAnalytics.improvement;
  
  let summary = `Your overall performance on ${attempt.series.title} shows ${accuracy.toFixed(1)}% accuracy `;
  
  if (improvement > 5) {
    summary += `with significant improvement of ${improvement.toFixed(1)}% from your previous attempts. `;
  } else if (improvement > 0) {
    summary += `with slight improvement of ${improvement.toFixed(1)}% from your previous attempts. `;
  } else {
    summary += `maintaining consistent performance. `;
  }
  
  if (accuracy >= 80) {
    summary += "Excellent work! You're demonstrating strong mastery of the subject matter.";
  } else if (accuracy >= 70) {
    summary += "Good performance with room for improvement. Focus on the recommended areas.";
  } else {
    summary += "This exam highlights key areas for improvement. Follow the action plan for better results.";
  }
  
  return summary;
}

function generateStudyRecommendations(performanceAnalytics, weaknessAnalysis) {
  const recommendations = [];
  
  if (performanceAnalytics.overall.accuracy < 70) {
    recommendations.push("Focus on fundamental concepts before attempting practice tests");
    recommendations.push("Review incorrect answers thoroughly to understand mistakes");
  }
  
  if (performanceAnalytics.timeAnalysis.questionsOverTime > 5) {
    recommendations.push("Practice time management with timed question sets");
    recommendations.push("Identify question patterns that take longer and practice those specifically");
  }
  
  recommendations.push("Create a daily study schedule with regular practice sessions");
  recommendations.push("Use active recall and spaced repetition techniques");
  
  return recommendations;
}

function getMotivationalMessage(accuracy) {
  if (accuracy >= 85) {
    return "Outstanding performance! You're well on your way to exam success. Keep up this excellent momentum!";
  } else if (accuracy >= 75) {
    return "Great job! You're showing strong progress. A little more focus on weak areas will get you to the top!";
  } else if (accuracy >= 65) {
    return "Good effort! You're building a solid foundation. Consistent practice will definitely improve your scores!";
  } else {
    return "Every expert was once a beginner. Use this analysis to guide your study plan and you'll see improvement soon!";
  }
}

// Run the test
if (require.main === module) {
  testEnhancedPdfGeneration()
    .then(() => {
      console.log('🎉 Enhanced PDF test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Enhanced PDF test failed:', error);
      process.exit(1);
    });
}

module.exports = { testEnhancedPdfGeneration };
