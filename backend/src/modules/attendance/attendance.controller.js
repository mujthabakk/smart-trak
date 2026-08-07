const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/pagination');
const { resolveSchoolId } = require('../../middleware/auth');
const ApiError = require('../../utils/ApiError');
const service = require('./attendance.service');
const tripsService = require('../trips/trips.service');
const driversService = require('../drivers/drivers.service');

/** Throws unless the trip belongs to the logged-in driver — reuses the same
 * ownership check the trips module applies to its own status-only PATCH. */
async function assertDriverOwnsTrip(tripId, userId) {
  const ownsTrip = await tripsService.isDriverOwnTrip(tripId, userId);
  if (!ownsTrip) throw ApiError.forbidden('You do not have permission to manage attendance for this trip');
}

const list = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const pagination = parsePagination(req.query);
  const filters = {
    trip_id: req.query.trip_id,
    student_id: req.query.student_id,
    date: req.query.date,
    status: req.query.status,
  };

  if (req.user.role === 'driver') {
    // Drivers only ever see attendance for their own trips — resolved server-side
    // so a spoofed trip_id/driver filter can't be used to view another driver's roster.
    const driverId = await driversService.getIdByUserId(req.user.id, req.user.school_id);
    filters.driver_id = driverId || '__none__';
  } else if (req.user.role === 'parent') {
    filters.parentUserId = req.user.id;
  }

  const result = await service.list(schoolId, pagination, filters);
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  res.json({ record: await service.getById(req.params.id, schoolId) });
});

const mark = asyncHandler(async (req, res) => {
  const schoolId = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
  if (!schoolId && req.user.role !== 'super_admin') {
    throw ApiError.badRequest('Account is not associated with a school');
  }
  if (req.user.role === 'driver') await assertDriverOwnsTrip(req.body.trip_id, req.user.id);

  const record = await service.markAttendance(schoolId || null, req.body);
  res.status(201).json({ record });
});

const scan = asyncHandler(async (req, res) => {
  const schoolId = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
  if (!schoolId && req.user.role !== 'super_admin') {
    throw ApiError.badRequest('Account is not associated with a school');
  }
  if (req.user.role === 'driver') await assertDriverOwnsTrip(req.body.trip_id, req.user.id);

  const record = await service.markByQrCode(schoolId || null, req.body.trip_id, req.body.qr_code, req.body.stop_id);
  res.status(201).json({ record });
});

const bulk = asyncHandler(async (req, res) => {
  const schoolId = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
  if (!schoolId && req.user.role !== 'super_admin') {
    throw ApiError.badRequest('Account is not associated with a school');
  }
  if (req.user.role === 'driver') await assertDriverOwnsTrip(req.body.trip_id, req.user.id);

  const records = await service.bulkMark(schoolId || null, req.body.trip_id, req.body.records);
  res.status(201).json({ records });
});

const update = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  if (req.user.role === 'driver') {
    const tripId = await service.getTripIdForRecord(req.params.id);
    await assertDriverOwnsTrip(tripId, req.user.id);
  }
  res.json({ record: await service.update(req.params.id, schoolId, req.body) });
});

const remove = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  if (req.user.role === 'driver') {
    const tripId = await service.getTripIdForRecord(req.params.id);
    await assertDriverOwnsTrip(tripId, req.user.id);
  }
  await service.remove(req.params.id, schoolId);
  res.status(204).send();
});

module.exports = { list, getOne, mark, scan, bulk, update, remove };
