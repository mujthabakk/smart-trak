const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/pagination');
const service = require('./emailLogs.service');

const list = asyncHandler(async (req, res) => {
  res.json(await service.list(parsePagination(req.query)));
});

module.exports = { list };
