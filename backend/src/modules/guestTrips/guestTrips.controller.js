const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/pagination');
const { resolveSchoolId } = require('../../middleware/auth');
const ApiError = require('../../utils/ApiError');
const service = require('./guestTrips.service');

const ADMIN_ROLES = ['super_admin', 'school_admin'];

const list = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const pagination = parsePagination(req.query);
  const result = await service.list(schoolId, pagination, { status: req.query.status });
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  res.json({ trip: await service.getById(req.params.id, schoolId) });
});

const create = asyncHandler(async (req, res) => {
  const schoolId = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
  if (!schoolId) throw ApiError.badRequest('school_id is required');
  const trip = await service.create(schoolId, req.body);
  res.status(201).json({ trip });
});

const update = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  if (['approved', 'rejected'].includes(req.body.status) && !ADMIN_ROLES.includes(req.user.role)) {
    throw ApiError.forbidden('Only a school or super admin can approve or reject a guest trip');
  }
  const trip = await service.update(req.params.id, schoolId, req.body, req.user.id);
  res.json({ trip });
});

module.exports = { list, getOne, create, update };
