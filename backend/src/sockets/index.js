const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const env = require('../config/env');
const { query } = require('../config/db');

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

    socket.join(`user:${userId}`);

    if (schoolId) {
      socket.join(`school:${schoolId}`);
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

      const event = {
        trip_id, bus_id, latitude, longitude, speed: speed || 0,
        current_stop: current_stop || undefined, status: status || 'in_progress',
        recorded_at: new Date().toISOString(),
      };
      if (schoolId) io.to(`school:${schoolId}`).emit('bus:location', event);
      io.to(`trip:${trip_id}`).emit('bus:location', event);
      io.to(`bus:${bus_id}`).emit('bus:location', event);
    });
  });

  return io;
}

module.exports = { attachSockets };
