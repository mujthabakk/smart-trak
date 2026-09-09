const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/pagination');
const { resolveSchoolId } = require('../../middleware/auth');
const ApiError = require('../../utils/ApiError');
const { recordAudit } = require('../auditLogs/auditLogs.service');
const service = require('./buses.service');

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
  res.json({ bus: await service.getById(req.params.id, schoolId) });
});

const create = asyncHandler(async (req, res) => {
  const schoolId = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
  if (!schoolId) throw ApiError.badRequest('school_id is required');
  const buses = await service.createMany(schoolId, req.body.buses);
  await Promise.all(buses.map((bus) => recordAudit({
    user_id: req.user.id, school_id: schoolId, action: 'bus.create',
    entity_type: 'bus', entity_id: bus.id, details: { bus_number: bus.bus_number },
  })));
  res.status(201).json({ buses });
});

const update = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const bus = await service.update(req.params.id, schoolId, req.body);
  await recordAudit({
    user_id: req.user.id, school_id: schoolId, action: 'bus.update',
    entity_type: 'bus', entity_id: bus.id, details: { bus_number: bus.bus_number },
  });
  res.json({ bus });
});

const remove = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  await service.remove(req.params.id, schoolId);
  await recordAudit({
    user_id: req.user.id, school_id: schoolId, action: 'bus.delete',
    entity_type: 'bus', entity_id: req.params.id,
  });
  res.status(204).send();
});

const getLocation = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const location = await service.getLatestLocation(req.params.id, schoolId);
  res.json({ location });
});

module.exports = { list, getOne, create, update, remove, getLocation };
