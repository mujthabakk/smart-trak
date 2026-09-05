const { masterPool, getTenantPool, tenantContext, query } = require('../config/db');
const { todayInTimezone } = require('../utils/timezone');
const tripsService = require('../modules/trips/trips.service');
const reportsService = require('../modules/reports/reports.service');

const CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes — see module comment for why exact-midnight precision isn't needed

/** Mirrors middleware/tenant.js's / sockets/index.js's school_id -> tenant
 * DB name derivation (this job runs outside any request, so there's no
 * middleware to have already resolved this). */
function tenantPoolForSchool(schoolId) {
  return getTenantPool(`smarttrack_${schoolId.replace('-', '_').toLowerCase()}`);
}

/**
 * A driver who never taps "End Trip" leaves their bus reporting as
 * permanently "running" and the trip stuck "in_progress" forever — visible
 * everywhere from the admin's live trip list to next-day dashboard stats.
 * Each school's own midnight (its own IANA timezone, not server time) is
 * the natural boundary: once a trip's trip_date is before that school's
 * own current date, it's stale and gets force-closed exactly like a normal
 * end-trip — reuses trips.service.js's update(), which already runs the
 * same transactional bus reset (current_trip_id -> NULL, status -> idle)
 * a real driver-initiated end-trip does — just without a driver's scan.
 */
async function closeStaleTripsForSchool(io, schoolId, timezone) {
  const pool = tenantPoolForSchool(schoolId);
  await tenantContext.run({ pool }, async () => {
    const today = todayInTimezone(timezone || 'Asia/Kolkata');
    const { rows: staleTrips } = await query(
      `SELECT id FROM trips WHERE status = 'in_progress' AND trip_date < $1`,
      [today]
    );
    if (staleTrips.length === 0) return;

    for (const trip of staleTrips) {
      try {
        const updated = await tripsService.update(trip.id, schoolId, {
          status: 'completed',
          ended_at: new Date().toISOString(),
        });
        console.log(`[trip-auto-close] Closed stale trip ${trip.id} for school ${schoolId} (was still in_progress before ${today})`);
        if (io) {
          const event = { trip_id: trip.id, bus_id: updated.bus_id, status: 'completed' };
          io.to(`school:${schoolId}`).emit('trip:status', event);
          io.to(`trip:${trip.id}`).emit('trip:status', event);
          if (updated.bus_id) io.to(`bus:${updated.bus_id}`).emit('trip:status', event);
        }
      } catch (err) {
        console.error(`[trip-auto-close] Failed to close stale trip ${trip.id}`, err);
      }
    }

    if (io) {
      reportsService.getAdminDashboardStats(schoolId).then((stats) => {
        io.to(`school:${schoolId}`).emit('dashboard:stats', stats);
      }).catch((err) => console.error('[trip-auto-close] Failed to broadcast dashboard:stats', err));

      tripsService.list(schoolId, { page: 1, pageSize: 200, offset: 0 }, { status: 'in_progress' }).then(({ trips }) => {
        io.to(`school:${schoolId}`).emit('live-trips:update', { trips });
      }).catch((err) => console.error('[trip-auto-close] Failed to broadcast live-trips:update', err));
    }
  });
}

async function checkAllSchools(io) {
  let schools;
  try {
    ({ rows: schools } = await masterPool.query('SELECT id, timezone FROM schools'));
  } catch (err) {
    console.error('[trip-auto-close] Failed to list schools', err);
    return;
  }
  for (const school of schools) {
    await closeStaleTripsForSchool(io, school.id, school.timezone).catch((err) => {
      console.error(`[trip-auto-close] Failed checking school ${school.id}`, err);
    });
  }
}

/** Call once at server startup, passing the same `io` instance the HTTP
 * server uses. Runs an immediate check (so a server restart doesn't leave
 * stale trips open until the next tick), then every CHECK_INTERVAL_MS. */
function startTripAutoCloseJob(io) {
  checkAllSchools(io);
  setInterval(() => checkAllSchools(io), CHECK_INTERVAL_MS);
}

module.exports = { startTripAutoCloseJob };
