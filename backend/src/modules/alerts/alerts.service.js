const { query } = require('../../config/db');
const { createNotification } = require('../notifications/notifications.service');

function toResponse(row) {
  return {
    id: row.id,
    student_id: row.student_id,
    student_name: row.student_name,
    stop_id: row.stop_id,
    stop_name: row.stop_name,
    trip_id: row.trip_id,
    alert_type: row.alert_type,
    distance_m: row.distance_m != null ? Number(row.distance_m) : undefined,
    message: row.message,
    fired_at: row.fired_at,
  };
}

/**
 * Alerts fired in the last `hours` (default 12) — see checkAlertsForStop
 * below for how alert_events rows are created. This is deliberately a plain
 * REST endpoint, not a socket: the mobile app's "Alerts" list is a pull, not
 * a live feed.
 */
async function list(schoolId, { hours = 12, studentId, parentUserId }) {
  const conditions = ['ae.fired_at >= now() - make_interval(hours => $1)'];
  const params = [hours];
  if (schoolId) {
    params.push(schoolId);
    conditions.push(`s.school_id = $${params.length}`);
  }
  if (studentId) {
    params.push(studentId);
    conditions.push(`ae.student_id = $${params.length}`);
  }
  if (parentUserId) {
    // Same ownership pattern as attendance.service.js's list()/getDaySummary —
    // a parent only ever sees alerts for their own children.
    params.push(parentUserId);
    conditions.push(`EXISTS (
      SELECT 1 FROM parent_details pd
      JOIN users u ON lower(u.email) = lower(pd.email)
      WHERE pd.student_id = s.id AND u.id = $${params.length}
    )`);
  }

  const { rows } = await query(
    `SELECT ae.*, s.name AS student_name, s.school_id, st.name AS stop_name
     FROM alert_events ae
     JOIN students s ON s.id = ae.student_id
     JOIN stops st ON st.id = ae.stop_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY ae.fired_at DESC`,
    params
  );

  return { alerts: rows.map(toResponse) };
}

/**
 * Fires a "bus reached your alert stop" notification, driven by attendance
 * being marked at a stop — not live GPS coordinates. The dashboard only
 * needs to know a stop was actually reached (confirmed by an attendance
 * mark there), same signal current_stop/stop_name already use; a student's
 * alert_pickup_stop_id/alert_drop_stop_id is independent of their real
 * pickup/drop stop (migration 010_alert_stops.sql), so this checks every
 * student on the school, not just those on the trip being marked.
 * Idempotent per (trip, student, alert_type) via alert_events' UNIQUE
 * constraint, same as day-to-day "reset" — a new trip tomorrow, a fresh row.
 */
async function checkAlertsForStop({ schoolId, tripId, stopId, tripType }) {
  if (tripType !== 'pickup' && tripType !== 'drop') return;
  const column = tripType === 'pickup' ? 'alert_pickup_stop_id' : 'alert_drop_stop_id';

  const { rows: candidates } = await query(
    `SELECT s.id AS student_id, s.name AS student_name, st.name AS stop_name
     FROM students s
     JOIN stops st ON st.id = s.${column}
     WHERE s.${column} = $1`,
    [stopId]
  );

  for (const c of candidates) {
    const message = `The bus has reached ${c.stop_name}.`;
    const { rows: inserted } = await query(
      `INSERT INTO alert_events (student_id, stop_id, trip_id, alert_type, message)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (trip_id, student_id, alert_type) DO NOTHING
       RETURNING id`,
      [c.student_id, stopId, tripId, tripType, message]
    );
    if (!inserted[0]) continue; // already fired for this student/trip

    const { rows: parentRows } = await query(
      `SELECT u.id FROM parent_details pd
       JOIN users u ON lower(u.email) = lower(pd.email)
       WHERE pd.student_id = $1`,
      [c.student_id]
    );
    for (const parent of parentRows) {
      await createNotification({
        school_id: schoolId,
        user_id: parent.id,
        title: 'Bus approaching',
        body: `${c.student_name}: ${message}`,
        type: 'info', // notifications.type has no 'stop_alert' value
      }).catch((err) => console.error('Failed to send stop alert notification', err));
    }
  }
}

module.exports = { list, checkAlertsForStop };
