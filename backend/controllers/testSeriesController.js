const TestSeries = require('../models/TestSeries');

exports.createTestSeries = async (req, res) => {
  try {
    const { title, description, questions, startTime, endTime } = req.body;
    const testSeries = await TestSeries.create({
      title,
      description,
      questions,
      startTime,
      endTime,
      createdBy: req.user.id
    });

    res.status(201).json({ message: 'Test series created', testSeries });
  } catch (err) {
    res.status(500).json({ message: 'Error creating test series', error: err.message });
  }
};
