const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/pagination');
const { resolveSchoolId } = require('../../middleware/auth');
const ApiError = require('../../utils/ApiError');
const service = require('./leave.service');
const reportsService = require('../reports/reports.service');

const ADMIN_ROLES = ['super_admin', 'school_admin'];

/** Recomputes and pushes the school admin app's home-screen aggregate stats —
 * see reportsService.getAdminDashboardStats. Mirrors the same helper in
 * trips.controller.js / attendance.controller.js. */
function broadcastDashboardStats(req, schoolId) {
  const io = req.app.get('io');
  if (!io || !schoolId) return;
  reportsService.getAdminDashboardStats(schoolId).then((stats) => {
    io.to(`school:${schoolId}`).emit('dashboard:stats', stats);
  }).catch((err) => console.error('Failed to broadcast dashboard:stats', err));
}

const getReasons = asyncHandler(async (req, res) => {
  res.json({
    reasons: [
      'Sick',
      'Family Function',
      'Travel',
      'Medical Appointment',
      'Personal',
      'Other',
    ],
  });
});

const list = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const pagination = parsePagination(req.query);
  const result = await service.list(schoolId, pagination, {
    student_id: req.query.student_id,
    status: req.query.status,
    from: req.query.from,
    to: req.query.to,
    date: req.query.date,
    shift: req.query.shift,
    // Parents only ever see/manage leave requests for their own child(ren).
    parentUserId: req.user.role === 'parent' ? req.user.id : undefined,
  });
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const parentUserId = req.user.role === 'parent' ? req.user.id : undefined;
  res.json({ leave: await service.getById(req.params.id, schoolId, parentUserId) });
});

const create = asyncHandler(async (req, res) => {
  const schoolId = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
  if (!schoolId) throw ApiError.badRequest('school_id is required');
  const parentUserId = req.user.role === 'parent' ? req.user.id : undefined;
  const leave = await service.create(schoolId, req.body, parentUserId);
  res.status(201).json({ leave });
});

const update = asyncHandler(async (req, res) => {
  if (req.body.status !== undefined && !ADMIN_ROLES.includes(req.user.role)) {
    throw ApiError.forbidden('Only school admins can approve or reject leave requests');
  }
  const schoolId = resolveSchoolId(req);
  if (req.user.role === 'parent') {
    // Confirms the record is theirs before allowing the edit; 404s otherwise.
    await service.getById(req.params.id, schoolId, req.user.id);
  }
  const leave = await service.update(req.params.id, schoolId, req.body, req.user.id);
  if (req.body.status !== undefined) broadcastDashboardStats(req, schoolId);
  res.json({ leave });
});

const remove = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const parentUserId = req.user.role === 'parent' ? req.user.id : undefined;
  await service.remove(req.params.id, schoolId, parentUserId);
  res.status(204).send();
});

module.exports = { list, getOne, create, update, remove, getReasons };
