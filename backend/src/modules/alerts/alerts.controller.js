const asyncHandler = require('../../utils/asyncHandler');
const { resolveSchoolId } = require('../../middleware/auth');
const service = require('./alerts.service');

const list = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const parentUserId = req.user.role === 'parent' ? req.user.id : undefined;
  const result = await service.list(schoolId, {
    hours: req.query.hours,
    studentId: req.query.student_id,
    parentUserId,
  });
  res.json(result);
});

module.exports = { list };
