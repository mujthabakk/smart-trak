const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/pagination');
const { resolveSchoolId } = require('../../middleware/auth');
const ApiError = require('../../utils/ApiError');
const service = require('./drivers.service');

const list = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const pagination = parsePagination(req.query);
  const result = await service.list(schoolId, pagination, {
    search: req.query.search,
    is_active: req.query.is_active,
  });
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  res.json({ driver: await service.getById(req.params.id, schoolId) });
});

const create = asyncHandler(async (req, res) => {
  const schoolId = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
  if (!schoolId) throw ApiError.badRequest('school_id is required');
  const driver = await service.create(schoolId, req.body);
  res.status(201).json({ driver });
});

const update = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  res.json({ driver: await service.update(req.params.id, schoolId, req.body) });
});

const remove = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  await service.remove(req.params.id, schoolId);
  res.status(204).send();
});

const expiringDocuments = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const days = Math.max(1, parseInt(req.query.days, 10) || 30);
  const drivers = await service.expiringDocuments(schoolId, days);
  res.json({ drivers });
});

module.exports = { list, getOne, create, update, remove, expiringDocuments };
