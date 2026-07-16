const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/pagination');
const { resolveSchoolId } = require('../../middleware/auth');
const ApiError = require('../../utils/ApiError');
const service = require('./leave.service');

const ADMIN_ROLES = ['super_admin', 'school_admin'];

const list = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const pagination = parsePagination(req.query);
  const result = await service.list(schoolId, pagination, {
    student_id: req.query.student_id,
    status: req.query.status,
    from: req.query.from,
    to: req.query.to,
  });
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  res.json({ leave: await service.getById(req.params.id, schoolId) });
});

const create = asyncHandler(async (req, res) => {
  const schoolId = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
  if (!schoolId) throw ApiError.badRequest('school_id is required');
  const leave = await service.create(schoolId, req.body);
  res.status(201).json({ leave });
});

const update = asyncHandler(async (req, res) => {
  if (req.body.status !== undefined && !ADMIN_ROLES.includes(req.user.role)) {
    throw ApiError.forbidden('Only school admins can approve or reject leave requests');
  }
  const schoolId = resolveSchoolId(req);
  const leave = await service.update(req.params.id, schoolId, req.body, req.user.id);
  res.json({ leave });
});

const remove = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  await service.remove(req.params.id, schoolId);
  res.status(204).send();
});

module.exports = { list, getOne, create, update, remove };
