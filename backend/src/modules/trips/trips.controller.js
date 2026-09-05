const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/pagination');
const { resolveSchoolId } = require('../../middleware/auth');
const ApiError = require('../../utils/ApiError');
const service = require('./trips.service');
const driversService = require('../drivers/drivers.service');
const attendanceService = require('../attendance/attendance.service');
const reportsService = require('../reports/reports.service');

/** Recomputes and pushes the school admin app's home-screen aggregate stats
 * (bus status / attendance / leave counts) — see
 * reportsService.getAdminDashboardStats. Called wherever a trip, attendance
 * mark, or leave approval could move those counts. */
function broadcastDashboardStats(io, schoolId) {
  if (!io || !schoolId) return;
  reportsService.getAdminDashboardStats(schoolId).then((stats) => {
    io.to(`school:${schoolId}`).emit('dashboard:stats', stats);
  }).catch((err) => console.error('Failed to broadcast dashboard:stats', err));
}

/** Recomputes and pushes the admin "Live Tracking"/"All Buses" list — the
 * same shape as GET /trips?status=in_progress — so that screen updates live
 * instead of needing to poll. Called wherever a trip starts/ends or
 * attendance changes (present_count shown on each card). */
function broadcastLiveTrips(io, schoolId) {
  if (!io || !schoolId) return;
  service.list(schoolId, { page: 1, pageSize: 200, offset: 0 }, { status: 'in_progress' }).then(({ trips }) => {
    io.to(`school:${schoolId}`).emit('live-trips:update', { trips });
  }).catch((err) => console.error('Failed to broadcast live-trips:update', err));
}

/** Pushes an immediate bus-status change to the Live Map instead of leaving
 * clients to wait on the next bus:location GPS ping (which may never come —
 * e.g. the driver app stops its tracker right as the trip ends) to notice a
 * trip started/ended. Also fans out a bus:status card update to every
 * student on the route (not just whoever's attendance last changed) so a
 * trip starting/ending flips every affected student out of "not started". */
function emitTripStatus(req, { schoolId, tripId, busId, status, routeId }) {
  const io = req.app.get('io');
  if (!io || !busId) return;
  const event = { trip_id: tripId, bus_id: busId, status };
  if (schoolId) io.to(`school:${schoolId}`).emit('trip:status', event);
  io.to(`trip:${tripId}`).emit('trip:status', event);
  io.to(`bus:${busId}`).emit('trip:status', event);

  if (schoolId && routeId) {
    service.getStudentIdsForRoute(routeId).then((studentIds) => {
      for (const studentId of studentIds) {
        attendanceService.getDaySummary(schoolId, studentId).then((summary) => {
          io.to(`school:${schoolId}`).emit('bus:status', summary);
        }).catch((err) => console.error('Failed to broadcast bus:status', err));
      }
    }).catch((err) => console.error('Failed to resolve route students for bus:status', err));
  }

  broadcastDashboardStats(io, schoolId);
  broadcastLiveTrips(io, schoolId);
}

const list = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const pagination = parsePagination(req.query);
  let driverId = req.query.driver_id;

  if (req.user.role === 'driver') {
    // Drivers only ever see their own trips — resolved server-side, overriding
    // any driver_id a caller might pass to try to view someone else's trips.
    driverId = await driversService.getIdByUserId(req.user.id, req.user.school_id);
    driverId = driverId || '__none__';
  }

  const result = await service.list(schoolId, pagination, {
    route_id: req.query.route_id,
    bus_id: req.query.bus_id,
    driver_id: driverId,
    status: req.query.status,
    date: req.query.date,
  });
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  res.json({ trip: await service.getById(req.params.id, schoolId) });
});

const getBoardingStudents = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const students = await service.getBoardingStudents(req.params.id, schoolId);
  res.json({ students, counts: service.attendanceCounts(students) });
});

const sendMessage = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const notification = await service.sendMessageToDriver(req.params.id, schoolId, req.body);
  const io = req.app.get('io');
  if (io) io.to(`user:${notification.user_id}`).emit('notification:update');
  res.status(201).json({ notification });
});

const getPath = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  res.json({ points: await service.getPath(req.params.id, schoolId) });
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

  const trip = await service.update(req.params.id, schoolId, req.body);
  if (req.body.status === 'completed' || req.body.status === 'in_progress') {
    emitTripStatus(req, { schoolId, tripId: trip.id, busId: trip.bus_id, status: req.body.status, routeId: trip.route_id });
  }
  res.json({ trip });
});

const remove = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  await service.remove(req.params.id, schoolId);
  res.status(204).send();
});

const startTrip = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const result = await service.startTrip(schoolId, req.body, req.user.id);
  emitTripStatus(req, { schoolId, tripId: result.trip.id, busId: result.trip.bus_id, status: 'in_progress', routeId: result.trip.route_id });
  res.status(201).json(result);
});

const takeOverTrip = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const trip = await service.takeOverTrip(schoolId, req.body, req.user.id);
  emitTripStatus(req, { schoolId, tripId: trip.id, busId: trip.bus_id, status: 'in_progress', routeId: trip.route_id });
  res.json({ trip });
});

const prepareTrip = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const result = await service.prepareTrip(schoolId, req.body, req.user.id);
  res.status(201).json(result);
});

const startPreparedTrip = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const result = await service.startPreparedTrip(req.params.id, schoolId, req.user.id);
  emitTripStatus(req, { schoolId, tripId: result.trip.id, busId: result.trip.bus_id, status: 'in_progress', routeId: result.trip.route_id });
  res.json(result);
});

const endTrip = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const result = await service.endTrip(schoolId, req.body, req.user.id);
  emitTripStatus(req, { schoolId, tripId: result.trip.id, busId: result.trip.bus_id, status: 'completed', routeId: result.trip.route_id });
  res.json(result);
});

module.exports = { list, getOne, getBoardingStudents, sendMessage, getPath, create, update, remove, startTrip, takeOverTrip, prepareTrip, startPreparedTrip, endTrip };
