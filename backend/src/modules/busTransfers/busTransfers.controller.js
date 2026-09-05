const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/pagination');
const { resolveSchoolId } = require('../../middleware/auth');
const ApiError = require('../../utils/ApiError');
const service = require('./busTransfers.service');
const tripsService = require('../trips/trips.service');
const { query } = require('../../config/db');
const { createNotification } = require('../notifications/notifications.service');

/** Recomputes and pushes the admin "Live Tracking"/"All Buses" list — see
 * trips.controller.js's helper of the same name. A transfer repoints an
 * in-progress trip's bus_id immediately, so anyone watching that list needs
 * a fresh snapshot right away rather than waiting for the next GPS ping or
 * attendance mark to happen to trigger one. */
function broadcastLiveTrips(io, schoolId) {
  if (!io || !schoolId) return;
  tripsService.list(schoolId, { page: 1, pageSize: 200, offset: 0 }, { status: 'in_progress' }).then(({ trips }) => {
    io.to(`school:${schoolId}`).emit('live-trips:update', { trips });
  }).catch((err) => console.error('Failed to broadcast live-trips:update', err));
}

/**
 * Notifies both drivers affected once a transfer has a bus assigned to it
 * (whether via a direct admin-initiate or fulfilling a driver's own
 * request): the ORIGINAL driver — still trips.driver_id at this point,
 * assignBus never changes it — needs to know their bus changed under them;
 * the STANDBY driver named as new_driver_id (if any, and if different)
 * needs to know they're expected to scan the ORIGINAL bus's QR via
 * POST /trips/take-over to actually claim the trip. Pushed as both a live
 * socket event (while the app is open) and a real notification (in-app +
 * best-effort FCM push, for when it isn't).
 */
async function notifyAssignedDrivers(io, schoolId, transfer) {
  const { rows: tripRows } = await query(
    `SELECT d.user_id FROM trips t JOIN drivers d ON d.id = t.driver_id WHERE t.id = $1`,
    [transfer.original_trip_id]
  );
  const originalDriverUserId = tripRows[0]?.user_id;

  let newDriverUserId;
  if (transfer.new_driver_id) {
    const { rows: driverRows } = await query('SELECT user_id FROM drivers WHERE id = $1', [transfer.new_driver_id]);
    newDriverUserId = driverRows[0]?.user_id;
  }

  for (const userId of new Set([originalDriverUserId, newDriverUserId].filter(Boolean))) {
    if (io) io.to(`user:${userId}`).emit('bus-transfer:assigned', { transfer });

    const isStandbyDriver = userId === newDriverUserId && userId !== originalDriverUserId;
    createNotification({
      school_id: schoolId,
      user_id: userId,
      title: 'Bus transfer assigned',
      body: isStandbyDriver
        ? `You've been assigned to take over a trip — scan Bus ${transfer.original_bus_number}'s QR code to take over.`
        : `Your trip has been moved to Bus ${transfer.new_bus_number}.`,
      type: 'info',
    }).then(() => {
      if (io) io.to(`user:${userId}`).emit('notification:update');
    }).catch((err) => console.error('Failed to notify driver of bus transfer assignment', err));
  }
}

const list = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const pagination = parsePagination(req.query);
  const result = await service.list(schoolId, pagination, { status: req.query.status });
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  res.json({ transfer: await service.getById(req.params.id, schoolId) });
});

const create = asyncHandler(async (req, res) => {
  const schoolId = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
  if (!schoolId) throw ApiError.badRequest('school_id is required');
  const transfer = await service.create(schoolId, req.user.id, req.body);
  const io = req.app.get('io');
  broadcastLiveTrips(io, schoolId);
  await notifyAssignedDrivers(io, schoolId, transfer);
  res.status(201).json({ transfer });
});

const update = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  res.json({ transfer: await service.update(req.params.id, schoolId, req.body) });
});

/** A driver reports a problem on their own trip and asks for a replacement
 * bus — the admin picks which bus, this just raises the request. Pushes a
 * live socket event AND an in-app notification (best-effort push — see
 * utils/push.js) to every admin in the school so it surfaces immediately,
 * not just next time someone happens to open the transfers list. */
const requestTransferAction = asyncHandler(async (req, res) => {
  const schoolId = req.user.school_id;
  if (!schoolId) throw ApiError.badRequest('Account is not associated with a school');
  const transfer = await service.requestTransfer(schoolId, req.user.id, req.body.reason);

  const io = req.app.get('io');
  if (io) io.to(`school:${schoolId}`).emit('bus-transfer:requested', { transfer });

  const { rows: admins } = await query(
    `SELECT id FROM users WHERE school_id = $1 AND role = 'school_admin'`,
    [schoolId]
  );
  await Promise.all(admins.map((admin) =>
    createNotification({
      school_id: schoolId,
      user_id: admin.id,
      title: 'Bus transfer requested',
      body: `${transfer.original_bus_number ? `Bus ${transfer.original_bus_number}` : 'A bus'} needs a replacement: ${transfer.reason}`,
      type: 'warning',
    }).then(() => {
      if (io) io.to(`user:${admin.id}`).emit('notification:update');
    }).catch((err) => console.error('Failed to notify admin of bus transfer request', err))
  ));

  res.status(201).json({ transfer });
});

/** Admin fulfils a 'requested' transfer by picking the replacement bus. */
const assignBus = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const transfer = await service.assignBus(req.params.id, schoolId, req.user.id, req.body);
  const io = req.app.get('io');
  broadcastLiveTrips(io, schoolId);
  await notifyAssignedDrivers(io, schoolId, transfer);
  res.json({ transfer });
});

module.exports = { list, getOne, create, update, requestTransfer: requestTransferAction, assignBus };
