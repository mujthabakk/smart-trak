const asyncHandler = require('../../utils/asyncHandler');
const { resolveSchoolId } = require('../../middleware/auth');
const ApiError = require('../../utils/ApiError');
const service = require('./assistant.service');

const ask = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  if (!schoolId) {
    throw ApiError.badRequest('This assistant needs a specific school to answer about — pick one first.');
  }
  const answer = await service.ask(req.body.question, schoolId);
  res.json({ answer });
});

module.exports = { ask };
