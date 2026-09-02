const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/pagination');
const { resolveSchoolId } = require('../../middleware/auth');
const ApiError = require('../../utils/ApiError');
const { query } = require('../../config/db');
const service = require('./attendance.service');
const tripsService = require('../trips/trips.service');
const driversService = require('../drivers/drivers.service');
const alertsService = require('../alerts/alerts.service');

/** Throws unless the trip belongs to the logged-in driver — reuses the same
 * ownership check the trips module applies to its own status-only PATCH. */
async function assertDriverOwnsTrip(tripId, userId) {
  const ownsTrip = await tripsService.isDriverOwnTrip(tripId, userId);
  if (!ownsTrip) throw ApiError.forbidden('You do not have permission to manage attendance for this trip');
}

/** Helper to broadcast live socket events and notify parents */
async function broadcastAndNotify(req, schoolId, tripId, records, type) {
  // Broadcast socket event
  const io = req.app.get('io');
  if (io) {
    const event = { trip_id: tripId, timestamp: new Date().toISOString() };
    if (schoolId) io.to(`school:${schoolId}`).emit('attendance:updated', event);
    io.to(`trip:${tripId}`).emit('attendance:updated', event);

    // Bus-status cards are keyed per student, so recompute and push each
    // affected student's own summary rather than making clients refetch on
    // every attendance:updated tick. This fans out to *every* student on the
    // trip's route — not just the ones actually marked — for two reasons:
    // a stop-mate should see "the bus is at your stop" (getDaySummary's
    // stop_name) the moment anyone else there is marked, and every parent on
    // the trip should see the bus's general progress (current_stop)
    // regardless of whose stop was just marked.
    if (schoolId) {
      const { rows: tripRows } = await query('SELECT route_id FROM trips WHERE id = $1', [tripId]);
      const routeId = tripRows[0]?.route_id;
      const studentIds = routeId
        ? await tripsService.getStudentIdsForRoute(routeId).catch((err) => {
            console.error('Failed to resolve route students for bus:status', err);
            return (records || []).map((r) => r.student_id).filter(Boolean);
          })
        : (records || []).map((r) => r.student_id).filter(Boolean);
      for (const studentId of new Set(studentIds)) {
        service.getDaySummary(schoolId, studentId).then((summary) => {
          io.to(`school:${schoolId}`).emit('bus:status', summary);
        }).catch((err) => {
          console.error('Failed to broadcast bus:status', err);
        });
      }

      // Stop-proximity alerts, driven by attendance being marked at a stop —
      // not live GPS coordinates (see alertsService.checkAlertsForStop).
      if (type === 'pickup' || type === 'drop') {
        const stopIds = [...new Set((records || []).map((r) => r.stop_id).filter(Boolean))];
        for (const stopId of stopIds) {
          alertsService.checkAlertsForStop({ schoolId, tripId, stopId, tripType: type }).catch((err) => {
            console.error('Failed to check stop alerts', err);
          });
        }
      }
    }
  }

  // Notify parents
  if (records && records.length > 0) {
    // Fire and forget (don't block the response)
    service.notifyParentsForAttendance(records, type).catch(err => {
      console.error('Failed to notify parents for attendance', err);
    });
  }
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

/** Parent app's Attendance screen: morning/afternoon trip cards for one
 * student on one selected day. */
const getDaySummary = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const parentUserId = req.user.role === 'parent' ? req.user.id : undefined;
  const result = await service.getDaySummary(schoolId, req.query.student_id, req.query.date, parentUserId);
  res.json(result);
});

const mark = asyncHandler(async (req, res) => {
  const schoolId = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
  if (!schoolId && req.user.role !== 'super_admin') {
    throw ApiError.badRequest('Account is not associated with a school');
  }
  if (req.user.role === 'driver') await assertDriverOwnsTrip(req.body.trip_id, req.user.id);

  if (req.body.type === 'pickup') {
    req.body.pickup_time = new Date().toISOString();
  } else if (req.body.type === 'drop') {
    req.body.drop_time = new Date().toISOString();
  }

  const records = await service.markAttendance(schoolId || null, req.body);
  await broadcastAndNotify(req, schoolId, req.body.trip_id, records, req.body.type);
  res.status(201).json({ status: 'success', records });
});

const scan = asyncHandler(async (req, res) => {
  const schoolId = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
  if (!schoolId && req.user.role !== 'super_admin') {
    throw ApiError.badRequest('Account is not associated with a school');
  }
  if (req.user.role === 'driver') await assertDriverOwnsTrip(req.body.trip_id, req.user.id);

  const record = await service.markByQrCode(schoolId || null, req.body.trip_id, req.body.qr_code, req.body.stop_id);
  await broadcastAndNotify(req, schoolId, req.body.trip_id, [record], 'pickup'); // Assuming pickup for QR scan for simplicity if type not available in payload
  res.status(201).json({ record });
});

const bulk = asyncHandler(async (req, res) => {
  const schoolId = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
  if (!schoolId && req.user.role !== 'super_admin') {
    throw ApiError.badRequest('Account is not associated with a school');
  }
  if (req.user.role === 'driver') await assertDriverOwnsTrip(req.body.trip_id, req.user.id);

  const records = await service.bulkMark(schoolId || null, req.body.trip_id, req.body.records);
  await broadcastAndNotify(req, schoolId, req.body.trip_id, records, 'pickup');
  res.status(201).json({ records });
});

const bulkOffboard = asyncHandler(async (req, res) => {
  const schoolId = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
  if (!schoolId && req.user.role !== 'super_admin') {
    throw ApiError.badRequest('Account is not associated with a school');
  }
  if (req.user.role === 'driver') await assertDriverOwnsTrip(req.body.trip_id, req.user.id);

  const records = await service.bulkOffboard(schoolId || null, req.body.trip_id, req.body.records);
  await broadcastAndNotify(req, schoolId, req.body.trip_id, records, 'drop');
  res.status(200).json({ records });
});

const update = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  if (req.user.role === 'driver') {
    const tripId = await service.getTripIdForRecord(req.params.id);
    await assertDriverOwnsTrip(tripId, req.user.id);
  }
  const record = await service.update(req.params.id, schoolId, req.body);
  const tripId = await service.getTripIdForRecord(req.params.id);
  await broadcastAndNotify(req, schoolId, tripId, [record], 'pickup');
  res.json({ record });
});

const remove = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  if (req.user.role === 'driver') {
    const tripId = await service.getTripIdForRecord(req.params.id);
    await assertDriverOwnsTrip(tripId, req.user.id);
  }
  const tripId = await service.getTripIdForRecord(req.params.id);
  await service.remove(req.params.id, schoolId);
  await broadcastAndNotify(req, schoolId, tripId, [], null);
  res.status(204).send();
});

module.exports = { list, getOne, getDaySummary, mark, scan, bulk, bulkOffboard, update, remove };
