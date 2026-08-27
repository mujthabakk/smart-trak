const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/pagination');
const { resolveSchoolId } = require('../../middleware/auth');
const ApiError = require('../../utils/ApiError');
const service = require('./lostFound.service');
const { query } = require('../../config/db');

const list = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const pagination = parsePagination(req.query);
  const result = await service.list(schoolId, pagination, {
    bus_id: req.query.bus_id,
    status: req.query.status,
  });
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  res.json({ item: await service.getById(req.params.id, schoolId) });
});

const create = asyncHandler(async (req, res) => {
  const schoolId = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
  if (!schoolId) throw ApiError.badRequest('school_id is required');

  const data = { ...req.body };

  // Always forcefully assign driver_id and bus_id from the authenticated user's driver profile
  // This prevents foreign key errors if the frontend sends a user_id instead of a driver_id
  const { rows: drivers } = await query('SELECT id, assigned_bus_id FROM drivers WHERE user_id = $1', [req.user.id]);
  if (drivers[0]) {
    data.driver_id = drivers[0].id;
    if (!data.bus_id) data.bus_id = drivers[0].assigned_bus_id; // Only override bus_id if not explicitly provided, or maybe force it too?
    data.bus_id = data.bus_id || drivers[0].assigned_bus_id;
  }

  const item = await service.create(schoolId, data);
  res.status(201).json({ item });
});

const update = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  res.json({ item: await service.update(req.params.id, schoolId, req.body) });
});

const remove = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  await service.remove(req.params.id, schoolId);
  res.status(204).send();
});

const addClaim = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const claim = await service.addClaim(req.params.id, schoolId, req.body);
  res.status(201).json({ claim });
});

const updateClaim = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const claim = await service.updateClaim(req.params.id, req.params.claimId, schoolId, req.body);
  res.json({ claim });
});

module.exports = { list, getOne, create, update, remove, addClaim, updateClaim };
