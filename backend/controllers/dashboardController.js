/**
 * Dashboard Controller
 * 
 * Provides dashboard analytics and summary data for student and admin interfaces.
 * Handles student performance summaries, test history, and topic-wise analytics.
 * Generates personalized insights for student progress tracking and performance monitoring.
 * 
 * Features:
 * - Student dashboard with test performance summary
 * - Topic-wise performance analytics for targeted learning
 * - Test history and best performance tracking
 * - Average score calculations and progress metrics
 * 
 * @requires ../models/TestAttempt
 * @requires ../models/TestSeries
 * @requires ../models/Question
 * @requires ../models/Topic
 */

const TestAttempt = require('../models/TestAttempt');
const TestSeries = require('../models/TestSeries');
const Question = require('../models/Question');
const Topic = require('../models/Topic');

/**
 * Get Student Dashboard Endpoint
 * 
 * Retrieves comprehensive dashboard data for authenticated student including performance metrics.
 * Calculates total tests taken, average percentage, best performance, and detailed test history.
 * Provides personalized performance insights for student progress tracking.
 * 
 * @route GET /api/dashboard/student
 * @access Private (Student access)
 * @param {Object} req.user - Authenticated user object
 * @param {string} req.user.userId - Student ID for dashboard data retrieval
 * @returns {Object} Student dashboard summary
 * @returns {number} returns.totalTests - Total number of tests attempted
 * @returns {number} returns.averagePercentage - Average score percentage across all tests
 * @returns {Object} returns.bestPerformance - Best test performance with test name and score
 * @returns {Array} returns.testHistory - Detailed history of all test attempts
 * @throws {500} Server error during dashboard data calculation
 */
exports.getStudentDashboard = async (req, res) => {
  try {
    const studentId = req.user.userId;

    const attempts = await TestAttempt.find({ student: studentId }).populate('series');

    if (attempts.length === 0) {
      return res.json({
        totalTests: 0,
        averagePercentage: 0,
        bestPerformance: null,
        testHistory: []
      });
    }

    let totalScore = 0;
    let best = null;

    const testHistory = attempts.map((a) => {
      const score = a.percentage || 0;
      totalScore += score;

      if (!best || score > best.percentage) {
        best = { test: a.series.title, percentage: score };
      }

      return {
        test: a.series.title,
        percentage: score,
        submittedAt: a.submittedAt
      };
    });

    const average = totalScore / attempts.length;

    res.json({
      totalTests: attempts.length,
      averagePercentage: Math.max(0, Math.round(average)),
      bestPerformance: best,
      testHistory
    });

  } catch (err) {
    console.error('❌ Error in getStudentDashboard:', err);
    res.status(500).json({ message: 'Failed to load dashboard' });
  }
};

/**
 * Get Student Topic Analytics Endpoint
 * 
 * Provides detailed topic-wise performance analytics for the authenticated student.
 * Analyzes student performance across different topics to identify strengths and weaknesses.
 * Calculates accuracy rates and question counts per topic for targeted learning recommendations.
 * 
 * @route GET /api/dashboard/student/topics
 * @access Private (Student access)
 * @param {Object} req.user - Authenticated user object
 * @param {string} req.user.userId - Student ID for topic analytics
 * @returns {Array} Topic performance analytics
 * @returns {string} returns[].topic - Topic name
 * @returns {number} returns[].totalQuestions - Total questions attempted in this topic
 * @returns {number} returns[].correctAnswers - Number of correct answers in this topic
 * @returns {number} returns[].accuracy - Accuracy percentage for this topic
 * @throws {500} Server error during topic analytics calculation
 */
exports.getStudentTopicAnalytics = async (req, res) => {
  try {
    const studentId = req.user.userId;

    const attempts = await TestAttempt.find({ student: studentId });

    const topicMap = new Map();
    console.log('📊 Total attempts found:', attempts.length);

    for (const attempt of attempts) {
      console.log('⛳ Found attempt:', attempt._id);
    console.log('📦 Responses:', attempt.responses?.length);

      for (const response of attempt.responses) {
;

        console.log('⛳ Found attempt:', attempt._id);
        console.log('📦 Responses:', attempt.responses?.length);
        console.log('🔍 Question ID:', response.question);

        const question = await Question.findById(response.question).select('topic correctOptions');
        console.log('🧠 Found question:', question?.questionText);
        console.log('📎 Topic ID:', question?.topic);

        if (!question || !question.topic) continue;

        const topicId = question.topic.toString();
        const isCorrect = JSON.stringify(response.selected.sort()) === JSON.stringify(question.correctOptions.sort());

        if (!topicMap.has(topicId)) {
          topicMap.set(topicId, {
            topicId,
            totalQuestions: 0,
            correctAnswers: 0
          });
        }

        const data = topicMap.get(topicId);
        data.totalQuestions += 1;
        if (isCorrect) data.correctAnswers += 1;
      }
    }

    const topicIds = Array.from(topicMap.keys());
    const topicDetails = await Topic.find({ _id: { $in: topicIds } });

    const result = topicDetails.map(topic => {
      const stats = topicMap.get(topic._id.toString());
      return {
        topic: topic.name,
        totalQuestions: stats.totalQuestions,
        correctAnswers: stats.correctAnswers,
        accuracy: Math.round((stats.correctAnswers / stats.totalQuestions) * 100)
      };
    });

    res.json({ topics: result });

  } catch (err) {
    console.error('❌ Topic analytics error:', err);
    res.status(500).json({ message: 'Failed to load topic analytics' });
  }
};