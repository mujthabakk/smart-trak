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
    is_guest: req.query.is_guest,
  });
  res.json(result);
});

/** GET /drivers/guest — the natural mirror of POST /drivers/guest.
 * Equivalent to GET /drivers?is_guest=true, still honoring the usual
 * search/is_active/pagination params, just always scoped to guests. */
const listGuestDrivers = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const pagination = parsePagination(req.query);
  const result = await service.list(schoolId, pagination, {
    search: req.query.search,
    is_active: req.query.is_active,
    is_guest: 'true',
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

const createGuestDriver = asyncHandler(async (req, res) => {
  const schoolId = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
  if (!schoolId) throw ApiError.badRequest('school_id is required');
  const result = await service.createGuestDriver(req.user.role, schoolId, req.body);
  res.status(201).json(result);
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
  const days = parseInt(req.query.days, 10) || 30;
  res.json({ drivers: await service.expiringDocuments(schoolId, days) });
});

const getRouteStudents = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  res.json(await service.getRouteStudents(req.user.id, schoolId));
});

module.exports = { list, listGuestDrivers, getOne, create, createGuestDriver, update, remove, expiringDocuments, getRouteStudents };
