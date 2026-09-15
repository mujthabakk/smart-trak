const { GoogleGenAI } = require('@google/genai');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const { query } = require('../../config/db');
const studentsService = require('../students/students.service');
const busesService = require('../buses/buses.service');
const driversService = require('../drivers/drivers.service');
const routesService = require('../routesResource/routes.service');
const attendanceService = require('../attendance/attendance.service');
const leaveService = require('../leave/leave.service');

let client = null;
function getClient() {
  if (!env.geminiApiKey) return null;
  if (!client) client = new GoogleGenAI({ apiKey: env.geminiApiKey });
  return client;
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// Only school_admin/super_admin ever reach this widget (every other role is
// served by the mobile app, not this web console — see Login.tsx), so this
// always sees a whole-school snapshot, never a single parent's/driver's
// restricted view.
const PAGE = { page: 1, pageSize: 1000, offset: 0 };

async function buildSnapshot(schoolId) {
  const [studentsRes, busesRes, driversRes, routesRes, attendanceRes, leaveRes, activeTripRows] = await Promise.all([
    studentsService.list(schoolId, PAGE, {}),
    busesService.list(schoolId, PAGE, {}),
    driversService.list(schoolId, PAGE, {}),
    routesService.list(schoolId, PAGE, {}),
    attendanceService.list(schoolId, PAGE, { date: todayStr() }),
    leaveService.list(schoolId, PAGE, {}),
    query(
      `SELECT t.driver_id, t.bus_id, b.bus_number, d.name AS driver_name
       FROM trips t
       JOIN buses b ON b.id = t.bus_id
       JOIN drivers d ON d.id = t.driver_id
       WHERE t.status = 'in_progress' AND b.school_id = $1`,
      [schoolId]
    ).then((r) => r.rows),
  ]);

  const students = studentsRes.students;
  const buses = busesRes.buses;
  const drivers = driversRes.drivers;
  const routes = routesRes.routes;
  const attendance = attendanceRes.records;
  const leaves = leaveRes.leaves;

  // Buses, routes and drivers have no persisted assignment to each other —
  // "currently on a route/bus" only exists for the duration of an
  // in-progress trip, so it's cross-referenced from today's live trips.
  const routeByBusId = new Map(routes.filter((r) => r.bus_id).map((r) => [r.bus_id, r]));
  const activeTripByBusId = new Map(activeTripRows.map((t) => [t.bus_id, t]));
  const activeBusNumberByDriverId = new Map(activeTripRows.map((t) => [t.driver_id, t.bus_number]));

  return {
    date: todayStr(),
    students: {
      total: students.length,
      active: students.filter((s) => s.is_active).length,
    },
    attendance_today: {
      present: attendance.filter((a) => a.status === 'present').length,
      absent: attendance.filter((a) => a.status === 'absent').length,
      on_leave: attendance.filter((a) => a.status === 'leave').length,
      total_recorded: attendance.length,
    },
    buses: {
      total: buses.length,
      running: buses.filter((b) => b.status === 'running').length,
      idle: buses.filter((b) => b.status === 'idle').length,
      offline: buses.filter((b) => !b.status || b.status === 'offline').length,
      with_route_assigned: buses.filter((b) => routeByBusId.has(b.id)).length,
      without_route_assigned: buses.filter((b) => !routeByBusId.has(b.id)).length,
      list: buses.map((b) => ({
        bus_number: b.bus_number,
        status: b.status,
        is_active: b.is_active,
        driver: activeTripByBusId.get(b.id)?.driver_name || null,
        route: routeByBusId.get(b.id)?.name || null,
      })),
    },
    routes: {
      total: routes.length,
      active: routes.filter((r) => r.is_active).length,
      unassigned_to_bus: routes.filter((r) => !r.bus_id).length,
      list: routes.map((r) => ({
        name: r.name,
        bus_number: r.bus_number || null,
        driver: r.driver_name || null,
        student_count: r.student_count,
        is_active: r.is_active,
      })),
    },
    drivers: {
      total: drivers.length,
      active: drivers.filter((d) => d.is_active).length,
      list: drivers.map((d) => ({ name: d.name, is_active: d.is_active, current_bus_number: activeBusNumberByDriverId.get(d.id) || null, is_guest: d.is_guest })),
    },
    leave_requests: {
      pending: leaves.filter((l) => l.status === 'pending').length,
      approved: leaves.filter((l) => l.status === 'approved').length,
      pending_requests: leaves
        .filter((l) => l.status === 'pending')
        .slice(0, 15)
        .map((l) => ({ student: l.student_name, from: l.from_date, to: l.to_date })),
    },
  };
}

const SYSTEM_INSTRUCTION = `You are the SmartTrack Assistant, built into a school bus tracking and management console used by school admins.
You'll be given a JSON snapshot of today's live data for their school — students, buses, drivers, attendance, and leave requests — followed by their question.
Answer ONLY using facts present in that snapshot. Never invent numbers, names, or details that aren't in it. If the snapshot doesn't contain what's needed, say so plainly instead of guessing.
Keep answers short and easy to scan in a small chat widget: a sentence or two, or a brief bullet list for a set of items — never a long table.`;

async function ask(question, schoolId) {
  const genai = getClient();
  if (!genai) {
    throw new ApiError(503, 'The AI assistant is not configured — set GEMINI_API_KEY on the server.');
  }

  const snapshot = await buildSnapshot(schoolId);
  const contents = `Today's data snapshot for this school:\n${JSON.stringify(snapshot)}\n\nQuestion: ${question}`;

  const response = await genai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.3,
      maxOutputTokens: 1024,
    },
  });

  return response.text || "I couldn't generate a response — please try again.";
}

module.exports = { ask };
