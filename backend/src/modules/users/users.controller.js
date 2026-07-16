const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/pagination');
const { resolveSchoolId } = require('../../middleware/auth');
const service = require('./users.service');

const list = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const pagination = parsePagination(req.query);
  const result = await service.list(schoolId, pagination, {
    role: req.query.role,
    search: req.query.search,
  });
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  res.json({ user: await service.getById(req.params.id, schoolId) });
});

const create = asyncHandler(async (req, res) => {
  const schoolId = req.user.role === 'super_admin' ? (req.body.school_id || null) : req.user.school_id;
  const user = await service.create(req.user.role, schoolId, req.body);
  res.status(201).json({ user });
});

const update = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const user = await service.update(req.params.id, req.user.role, schoolId, req.body);
  res.json({ user });
});

const remove = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  await service.remove(req.params.id, req.user.role, schoolId);
  res.status(204).send();
});

module.exports = { list, getOne, create, update, remove };
