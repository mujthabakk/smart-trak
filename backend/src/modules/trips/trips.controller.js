const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/pagination');
const { resolveSchoolId } = require('../../middleware/auth');
const ApiError = require('../../utils/ApiError');
const service = require('./trips.service');

const list = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const pagination = parsePagination(req.query);
  const result = await service.list(schoolId, pagination, {
    route_id: req.query.route_id,
    bus_id: req.query.bus_id,
    driver_id: req.query.driver_id,
    status: req.query.status,
    date: req.query.date,
  });
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  res.json({ trip: await service.getById(req.params.id, schoolId) });
});

const create = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const trip = await service.create(schoolId, req.body);
  res.status(201).json({ trip });
});

const update = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);

  if (req.user.role === 'driver') {
    const bodyFields = Object.keys(req.body);
    if (bodyFields.some((field) => field !== 'status')) {
      throw ApiError.forbidden('Drivers may only update a trip\'s status');
    }
    const ownsTrip = await service.isDriverOwnTrip(req.params.id, req.user.id);
    if (!ownsTrip) throw ApiError.forbidden('You do not have permission to update this trip');
  }

  res.json({ trip: await service.update(req.params.id, schoolId, req.body) });
});

const remove = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  await service.remove(req.params.id, schoolId);
  res.status(204).send();
});

module.exports = { list, getOne, create, update, remove };
