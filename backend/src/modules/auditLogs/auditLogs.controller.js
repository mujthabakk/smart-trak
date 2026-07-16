const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/pagination');
const service = require('./auditLogs.service');

const list = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  const result = await service.list(req.user, pagination, {
    school_id: req.query.school_id,
    entity_type: req.query.entity_type,
    user_id: req.query.user_id,
    from: req.query.from,
    to: req.query.to,
  });
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  res.json({ log: await service.getById(req.params.id, req.user) });
});

module.exports = { list, getOne };
