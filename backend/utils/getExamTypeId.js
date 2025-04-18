const ExamType = require('../models/ExamType');

module.exports = async function getExamTypeId(code) {
  const clean = code.toLowerCase().trim();
  let type = await ExamType.findOne({ code: clean });
  if (!type) {
    type = await ExamType.create({
      code: clean,
      name: clean.charAt(0).toUpperCase() + clean.slice(1),
    });
  }
  return type._id;
};