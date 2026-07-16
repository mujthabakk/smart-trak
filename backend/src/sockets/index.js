const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const env = require('../config/env');
const { query } = require('../config/db');

/**
 * Live Map realtime channel.
 *
 * Rooms are per-school ("school:<id>") so a school_admin only receives GPS
 * pings for their own tenant; a driver client emits "bus:location" for the
 * bus/trip it is running, and the server rebroadcasts + persists a row to
 * bus_locations so REST clients (and the polling fallback) can catch up.
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
    const { role, school_id: schoolId } = socket.user;

    if (schoolId) {
      socket.join(`school:${schoolId}`);
    }

    socket.on('bus:location', async (payload) => {
      if (role !== 'driver' && role !== 'guest_driver') return;
      const { trip_id, bus_id, latitude, longitude, speed, current_stop, status } = payload || {};
      if (!trip_id || !bus_id || latitude == null || longitude == null) return;

      try {
        await query(
          `INSERT INTO bus_locations (trip_id, bus_id, latitude, longitude, speed, current_stop, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [trip_id, bus_id, latitude, longitude, speed || 0, current_stop || null, status || 'in_progress']
        );
        if (status) {
          await query('UPDATE buses SET status = $1, current_stop = $2 WHERE id = $3', [
            status === 'completed' ? 'idle' : 'running', current_stop || null, bus_id,
          ]);
        }
      } catch (err) {
        console.error('Failed to persist bus location', err);
      }

      const room = schoolId ? `school:${schoolId}` : null;
      const event = {
        trip_id, bus_id, latitude, longitude, speed: speed || 0,
        current_stop: current_stop || undefined, status: status || 'in_progress',
        recorded_at: new Date().toISOString(),
      };
      if (room) io.to(room).emit('bus:location', event);
    });
  });

  return io;
}

module.exports = { attachSockets };
