const TestAttempt = require('../models/TestAttempt');
const TestSeries = require('../models/TestSeries');
const Question = require('../models/Question');
const Topic = require('../models/Topic');

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