const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/pagination');
const { resolveSchoolId } = require('../../middleware/auth');
const ApiError = require('../../utils/ApiError');
const service = require('./busTransfers.service');

const list = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const pagination = parsePagination(req.query);
  const result = await service.list(schoolId, pagination, { status: req.query.status });
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  res.json({ transfer: await service.getById(req.params.id, schoolId) });
});

const create = asyncHandler(async (req, res) => {
  const schoolId = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
  if (!schoolId) throw ApiError.badRequest('school_id is required');
  const transfer = await service.create(schoolId, req.user.id, req.body);
  res.status(201).json({ transfer });
});

const update = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  res.json({ transfer: await service.update(req.params.id, schoolId, req.body) });
});

module.exports = { list, getOne, create, update };
