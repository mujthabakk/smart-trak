const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const env = require('../config/env');
const { query, tenantContext, getTenantPool, masterPool } = require('../config/db');
const { impliedSpeedKmh } = require('../utils/geo');
const reportsService = require('../modules/reports/reports.service');
const tripsService = require('../modules/trips/trips.service');
const busesService = require('../modules/buses/buses.service');

/** Mirrors middleware/tenant.js's school_id -> tenant DB name derivation, since
 * Socket.IO connections never pass through Express middleware and would
 * otherwise fall back to the master pool (which has its own empty copy of
 * every tenant table from the shared migrations). */
function tenantPoolForSchool(schoolId) {
  if (!schoolId) return masterPool;
  return getTenantPool(`smarttrack_${schoolId.replace('-', '_').toLowerCase()}`);
}

/**
 * Live Map realtime channel.
 *
 * Every client auto-joins "school:<id>" (unchanged, backward compatible) so a
 * school_admin dashboard watching the whole fleet still gets every bus's
 * ticks. Clients that only care about one bus/trip (e.g. a parent app
 * watching their child's ride) can additionally opt into "trip:<id>" /
 * "bus:<id>" rooms via join:trip/join:bus, so a driver's "bus:location"
 * emit is rebroadcast to all three rooms and a narrowly-scoped client no
 * longer has to filter every other bus's pings out client-side.
 */
function attachSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.corsOrigins.length ? env.corsOrigins : '*' },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error('Missing token');
      socket.user = verifyToken(token);
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, role, school_id: schoolId } = socket.user;
    const tenantPool = tenantPoolForSchool(schoolId);

    socket.join(`user:${userId}`);

    if (schoolId) {
      socket.join(`school:${schoolId}`);

      // Admin Dashboard stats (dashboard:stats) is push-only — there's no
      // separate REST endpoint for the client to poll for the initial
      // snapshot, so push it here the moment an admin's socket joins the
      // school room. Later changes (trip start/end, attendance, leave
      // approval) are pushed the same way from their respective controllers.
      if (role === 'school_admin' || role === 'super_admin') {
        tenantContext.run({ pool: tenantPool }, async () => {
          const stats = await reportsService.getAdminDashboardStats(schoolId);
          socket.emit('dashboard:stats', stats);
        }).catch((err) => console.error('Failed to push initial dashboard:stats', err));

        // Same push-only pattern for the "Live Tracking"/"All Buses" list —
        // no separate REST call needed on join, only on later changes.
        tenantContext.run({ pool: tenantPool }, async () => {
          const { trips } = await tripsService.list(schoolId, { page: 1, pageSize: 200, offset: 0 }, { status: 'in_progress' });
          socket.emit('live-trips:update', { trips });
        }).catch((err) => console.error('Failed to push initial live-trips:update', err));
      }
    }

    socket.on('join:trip', (tripId) => {
      if (tripId) socket.join(`trip:${tripId}`);
    });
    socket.on('leave:trip', (tripId) => {
      if (tripId) socket.leave(`trip:${tripId}`);
    });
    socket.on('join:bus', (busId) => {
      if (busId) socket.join(`bus:${busId}`);
    });
    socket.on('leave:bus', (busId) => {
      if (busId) socket.leave(`bus:${busId}`);
    });

    socket.on('bus:location', async (payload) => {
      if (role !== 'driver' && role !== 'guest_driver') return;
      const { trip_id, bus_id, latitude, longitude, current_stop, status } = payload || {};
      if (!trip_id || !bus_id || latitude == null || longitude == null) return;

      // The phone only ever sends lat/lng — speed is derived here from the
      // distance/time between this ping and the bus's last recorded one,
      // rather than trusting a client-supplied value (the app doesn't send one).
      let speed = 0;
      try {
        await tenantContext.run({ pool: tenantPool }, async () => {
          const { rows: prevRows } = await query(
            `SELECT latitude, longitude, recorded_at FROM bus_locations
             WHERE bus_id = $1 ORDER BY recorded_at DESC LIMIT 1`,
            [bus_id]
          );
          const prev = prevRows[0]
            ? {
                latitude: Number(prevRows[0].latitude),
                longitude: Number(prevRows[0].longitude),
                recordedAt: new Date(prevRows[0].recorded_at),
              }
            : null;
          speed = impliedSpeedKmh(prev, { latitude, longitude, recordedAt: new Date() });

          console.log(`[bus:location] driver=${userId} trip=${trip_id} bus=${bus_id} lat=${latitude} lng=${longitude} speed=${speed.toFixed(1)} status=${status || 'in_progress'}`);

          await query(
            `INSERT INTO bus_locations (trip_id, bus_id, latitude, longitude, speed, current_stop, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [trip_id, bus_id, latitude, longitude, speed, current_stop || null, status || 'in_progress']
          );
          if (status) {
            await query('UPDATE buses SET status = $1, current_stop = $2 WHERE id = $3', [
              status === 'completed' ? 'idle' : 'running', current_stop || null, bus_id,
            ]);
          }
        });
      } catch (err) {
        console.error('Failed to persist bus location', err);
      }

      const event = {
        trip_id, bus_id, latitude, longitude, speed,
        current_stop: current_stop || undefined, status: status || 'in_progress',
        recorded_at: new Date().toISOString(),
      };
      if (schoolId) io.to(`school:${schoolId}`).emit('bus:location', event);
      io.to(`trip:${trip_id}`).emit('bus:location', event);
      io.to(`bus:${bus_id}`).emit('bus:location', event);

      // Enriched version of the same ping (driver contact, route, live trip
      // status, onboard/total counts, ETA) for the admin Live Tracking detail
      // sheet — kept as a separate event so a plain marker-mover doesn't pay
      // for the extra joins on every tick.
      tenantContext.run({ pool: tenantPool }, async () => {
        const location = await busesService.getLatestLocation(bus_id, schoolId);
        if (!location) return;
        if (schoolId) io.to(`school:${schoolId}`).emit('bus:location:detail', location);
        io.to(`trip:${trip_id}`).emit('bus:location:detail', location);
        io.to(`bus:${bus_id}`).emit('bus:location:detail', location);
      }).catch((err) => console.error('Failed to broadcast bus:location:detail', err));
    });
  });

  return io;
}

module.exports = { attachSockets };
