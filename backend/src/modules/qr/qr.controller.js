const asyncHandler = require('../../utils/asyncHandler');
const { resolveSchoolId } = require('../../middleware/auth');
const service = require('./qr.service');

const resolve = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  res.json(await service.resolve(req.params.code, schoolId));
});

module.exports = { resolve };
