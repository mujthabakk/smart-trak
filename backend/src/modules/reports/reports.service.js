const { query } = require('../../config/db');
const { todayInTimezone, addDaysToDateString } = require('../../utils/timezone');

/**
 * Revenue by month for the last 12 months (calendar months, oldest first),
 * grouped from subscriptions.start_date. Uses generate_series so months with
 * no billing activity still appear with revenue/schools = 0, keeping the
 * series contiguous for the frontend line/area charts.
 * Shape: RevenueData[] -> { month, revenue, schools }
 */
async function getRevenueTrend() {
  const { rows } = await query(`
    SELECT
      to_char(gs.month, 'Mon YYYY') AS month,
      COALESCE(SUM(s.amount_paid), 0) AS revenue,
      COUNT(DISTINCT s.school_id) AS schools
    FROM generate_series(
      date_trunc('month', CURRENT_DATE) - INTERVAL '11 months',
      date_trunc('month', CURRENT_DATE),
      INTERVAL '1 month'
    ) AS gs(month)
    LEFT JOIN subscriptions s ON date_trunc('month', s.start_date) = gs.month
    GROUP BY gs.month
    ORDER BY gs.month
  `);

  return rows.map((row) => ({
    month: row.month,
    revenue: Number(row.revenue),
    schools: Number(row.schools),
  }));
}

/**
 * Platform-wide totals for the super_admin dashboard/reports overview.
 * Shape: StatsCard[]
 */
async function getPlatformStats() {
  const [schoolsResult, studentsResult, busesResult, revenueResult, ticketsResult] = await Promise.all([
    query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
      FROM schools
    `),
    query('SELECT COUNT(*)::int AS total FROM students'),
    query('SELECT COUNT(*)::int AS total FROM buses'),
    query(`
      SELECT
        COALESCE(SUM(amount_paid) FILTER (
          WHERE date_trunc('month', start_date) = date_trunc('month', CURRENT_DATE)
        ), 0) AS this_month,
        COALESCE(SUM(amount_paid) FILTER (
          WHERE date_trunc('month', start_date) = date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
        ), 0) AS last_month
      FROM subscriptions
    `),
    query("SELECT COUNT(*)::int AS total FROM support_tickets WHERE status = 'open'"),
  ]);

  const schools = schoolsResult.rows[0];
  const totalStudents = Number(studentsResult.rows[0].total);
  const totalBuses = Number(busesResult.rows[0].total);
  const thisMonthRevenue = Number(revenueResult.rows[0].this_month);
  const lastMonthRevenue = Number(revenueResult.rows[0].last_month);
  const openTickets = Number(ticketsResult.rows[0].total);

  const revenueChange = lastMonthRevenue > 0
    ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 1000) / 10
    : (thisMonthRevenue > 0 ? 100 : 0);

  return [
    {
      title: 'Total Schools',
      value: Number(schools.total),
      icon: 'School',
      color: 'blue',
      subtitle: `${Number(schools.active)} active, ${Number(schools.suspended)} suspended, ${Number(schools.pending)} pending`,
    },
    {
      title: 'Total Students',
      value: totalStudents,
      icon: 'Users',
      color: 'purple',
    },
    {
      title: 'Total Buses',
      value: totalBuses,
      icon: 'Bus',
      color: 'orange',
    },
    {
      title: 'Revenue This Month',
      value: thisMonthRevenue,
      change: revenueChange,
      changeLabel: 'vs last month',
      icon: 'DollarSign',
      color: 'green',
    },
    {
      title: 'Open Support Tickets',
      value: openTickets,
      icon: 'LifeBuoy',
      color: 'red',
    },
  ];
}

/**
 * Daily present/absent attendance counts for the last 14 days, scoped to a
 * single school (or platform-wide when schoolId is null, i.e. a super_admin
 * viewing without a ?school_id filter). attendance_records has no school_id
 * column directly, so the school scope is resolved via trip -> route.
 * Shape: ChartData[] -> { name, present, absent }
 */
async function getAttendanceTrend(schoolId) {
  const { rows } = await query(
    `
    WITH ar_filtered AS (
      SELECT ar.date, ar.status
      FROM attendance_records ar
      JOIN trips t ON t.id = ar.trip_id
      JOIN routes r ON r.id = t.route_id
      WHERE ar.date >= CURRENT_DATE - INTERVAL '13 days'
        AND ($1::text IS NULL OR r.school_id = $1)
    )
    SELECT
      to_char(gs.day, 'Mon DD') AS name,
      COUNT(*) FILTER (WHERE af.status = 'present') AS present,
      COUNT(*) FILTER (WHERE af.status = 'absent') AS absent
    FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day') AS gs(day)
    LEFT JOIN ar_filtered af ON af.date = gs.day::date
    GROUP BY gs.day
    ORDER BY gs.day
    `,
    [schoolId || null]
  );

  return rows.map((row) => ({
    name: row.name,
    present: Number(row.present),
    absent: Number(row.absent),
  }));
}

/**
 * Single-school (or platform-wide, when schoolId is null) fleet snapshot:
 * bus counts by active/inactive and by running/idle/offline status, plus
 * driver/route/student totals.
 * Shape: StatsCard[]
 */
async function getFleetSummary(schoolId) {
  const params = [];
  let where = '';
  if (schoolId) {
    params.push(schoolId);
    where = 'WHERE school_id = $1';
  }
  const andClause = (extra) => (where ? `${where} AND ${extra}` : `WHERE ${extra}`);

  const { rows } = await query(
    `SELECT
      (SELECT COUNT(*) FROM buses ${where})::int AS total_buses,
      (SELECT COUNT(*) FROM buses ${andClause('is_active = true')})::int AS active_buses,
      (SELECT COUNT(*) FROM buses ${andClause("status = 'running'")})::int AS running_buses,
      (SELECT COUNT(*) FROM buses ${andClause("status = 'idle'")})::int AS idle_buses,
      (SELECT COUNT(*) FROM buses ${andClause("status = 'offline'")})::int AS offline_buses,
      (SELECT COUNT(*) FROM drivers ${where})::int AS total_drivers,
      (SELECT COUNT(*) FROM routes ${where})::int AS total_routes,
      (SELECT COUNT(*) FROM students ${where})::int AS total_students
    `,
    params
  );

  const row = rows[0];
  const totalBuses = Number(row.total_buses);
  const activeBuses = Number(row.active_buses);

  return [
    {
      title: 'Total Buses',
      value: totalBuses,
      icon: 'Bus',
      color: 'blue',
      subtitle: `${activeBuses} active, ${totalBuses - activeBuses} inactive`,
    },
    {
      title: 'Buses Running',
      value: Number(row.running_buses),
      icon: 'Navigation',
      color: 'green',
      subtitle: `${Number(row.idle_buses)} idle, ${Number(row.offline_buses)} offline`,
    },
    {
      title: 'Total Drivers',
      value: Number(row.total_drivers),
      icon: 'UserCog',
      color: 'purple',
    },
    {
      title: 'Total Routes',
      value: Number(row.total_routes),
      icon: 'Route',
      color: 'orange',
    },
    {
      title: 'Total Students',
      value: Number(row.total_students),
      icon: 'GraduationCap',
      color: 'teal',
    },
  ];
}

/**
 * Count of schools created per calendar month, last 12 months (contiguous
 * via generate_series, same pattern as getRevenueTrend).
 * Shape: ChartData[] -> { name, value }
 */
async function getSchoolGrowth() {
  const { rows } = await query(`
    SELECT
      to_char(gs.month, 'Mon YYYY') AS name,
      COUNT(sc.id) AS value
    FROM generate_series(
      date_trunc('month', CURRENT_DATE) - INTERVAL '11 months',
      date_trunc('month', CURRENT_DATE),
      INTERVAL '1 month'
    ) AS gs(month)
    LEFT JOIN schools sc ON date_trunc('month', sc.created_at) = gs.month
    GROUP BY gs.month
    ORDER BY gs.month
  `);

  return rows.map((row) => ({
    name: row.name,
    value: Number(row.value),
  }));
}

/**
 * The school admin app's home-screen stats: bus status (on route / reached),
 * attendance (present / absent) and leave-applied counts, each split into
 * morning (pickup) / afternoon (drop) and — for leave — today vs tomorrow.
 * "Today"/"tomorrow" are resolved in the school's own timezone, matching
 * every other "what day is it" computation added this session
 * (attendance.service.js's getDaySummary, trips.service.js's schoolToday).
 * Pushed live over the 'dashboard:stats' socket event whenever a trip
 * starts/ends, attendance is marked, or a leave is approved/rejected — see
 * trips.controller.js, attendance.controller.js, leave.controller.js.
 */
async function getAdminDashboardStats(schoolId) {
  let timezone = 'Asia/Kolkata';
  if (schoolId) {
    const { rows } = await query('SELECT timezone FROM schools WHERE id = $1', [schoolId]);
    timezone = rows[0]?.timezone || timezone;
  }
  const today = todayInTimezone(timezone);
  const tomorrow = addDaysToDateString(today, 1);

  const [busResult, attResult, leaveResult] = await Promise.all([
    query(
      `SELECT t.trip_type,
         COUNT(*) FILTER (WHERE t.status = 'in_progress') AS on_route,
         COUNT(*) FILTER (WHERE t.status = 'completed') AS reached
       FROM trips t
       JOIN routes r ON r.id = t.route_id
       -- A trip still in_progress counts as "on route" regardless of which
       -- calendar day it started on (it may have started before midnight
       -- and still be running) — only "reached" (completed) is scoped to
       -- today specifically, via the OR below.
       WHERE (t.trip_date = $2 OR t.status = 'in_progress') AND ($1::text IS NULL OR r.school_id = $1)
       GROUP BY t.trip_type`,
      [schoolId || null, today]
    ),
    query(
      `SELECT t.trip_type,
         COUNT(*) FILTER (WHERE ar.status = 'present') AS present,
         COUNT(*) FILTER (WHERE ar.status = 'absent') AS absent
       FROM attendance_records ar
       JOIN trips t ON t.id = ar.trip_id
       JOIN routes r ON r.id = t.route_id
       WHERE ar.date = $2 AND ($1::text IS NULL OR r.school_id = $1)
       GROUP BY t.trip_type`,
      [schoolId || null, today]
    ),
    // full_day counts toward both morning and afternoon.
    query(
      `SELECT
         COUNT(*) FILTER (WHERE lv.from_date <= $2 AND lv.to_date >= $2 AND lv.shift IN ('morning','full_day')) AS morning_today,
         COUNT(*) FILTER (WHERE lv.from_date <= $2 AND lv.to_date >= $2 AND lv.shift IN ('evening','full_day')) AS afternoon_today,
         COUNT(*) FILTER (WHERE lv.from_date <= $3 AND lv.to_date >= $3 AND lv.shift IN ('morning','full_day')) AS morning_tomorrow,
         COUNT(*) FILTER (WHERE lv.from_date <= $3 AND lv.to_date >= $3 AND lv.shift IN ('evening','full_day')) AS afternoon_tomorrow
       FROM leaves lv
       WHERE lv.status = 'approved' AND ($1::text IS NULL OR lv.school_id = $1)`,
      [schoolId || null, today, tomorrow]
    ),
  ]);

  const busByType = Object.fromEntries(busResult.rows.map((r) => [r.trip_type, r]));
  const attByType = Object.fromEntries(attResult.rows.map((r) => [r.trip_type, r]));
  const lv = leaveResult.rows[0] || {};
  const n = (v) => Number(v || 0);

  return {
    date: today,
    bus_status: {
      morning: { on_route: n(busByType.pickup?.on_route), reached: n(busByType.pickup?.reached) },
      afternoon: { on_route: n(busByType.drop?.on_route), reached: n(busByType.drop?.reached) },
    },
    attendance_status: {
      morning: { present: n(attByType.pickup?.present), absent: n(attByType.pickup?.absent) },
      afternoon: { present: n(attByType.drop?.present), absent: n(attByType.drop?.absent) },
    },
    leave_applied: {
      morning: { today: n(lv.morning_today), tomorrow: n(lv.morning_tomorrow) },
      afternoon: { today: n(lv.afternoon_today), tomorrow: n(lv.afternoon_tomorrow) },
    },
  };
}

module.exports = {
  getRevenueTrend,
  getPlatformStats,
  getAttendanceTrend,
  getFleetSummary,
  getSchoolGrowth,
  getAdminDashboardStats,
};
