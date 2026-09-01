const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/pagination');
const { resolveSchoolId } = require('../../middleware/auth');
const ApiError = require('../../utils/ApiError');
const service = require('./students.service');

const list = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const pagination = parsePagination(req.query);
  const result = await service.list(schoolId, pagination, {
    search: req.query.search,
    class: req.query.class,
    division: req.query.division,
    is_active: req.query.is_active,
    // Parents only ever see their own child(ren) — matched by login email
    // against parent_details.email, never every student in the school.
    parentUserId: req.user.role === 'parent' ? req.user.id : undefined,
  });
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const parentUserId = req.user.role === 'parent' ? req.user.id : undefined;
  res.json({ student: await service.getById(req.params.id, schoolId, parentUserId) });
});

const create = asyncHandler(async (req, res) => {
  const schoolId = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
  if (!schoolId) throw ApiError.badRequest('school_id is required');
  const student = await service.create(schoolId, req.body);
  const io = req.app.get('io');
  if (io) io.to(`school:${schoolId}`).emit('student:update', { action: 'create', studentId: student.id });
  res.status(201).json({ student });
});

const update = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const student = await service.update(req.params.id, schoolId, req.body);
  const io = req.app.get('io');
  if (io) io.to(`school:${schoolId}`).emit('student:update', { action: 'update', studentId: student.id });
  res.json({ student });
});

const remove = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  await service.remove(req.params.id, schoolId);
  const io = req.app.get('io');
  if (io) io.to(`school:${schoolId}`).emit('student:update', { action: 'delete', studentId: req.params.id });
  res.status(204).send();
});

const updatePickupLocation = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const student = await service.updateLocation(req.params.id, schoolId, 'pickup', req.body.stop_id);
  const io = req.app.get('io');
  if (io) io.to(`school:${schoolId}`).emit('student:update', { action: 'update', studentId: student.id });
  res.json({ student });
});

const updateDropLocation = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const student = await service.updateLocation(req.params.id, schoolId, 'drop', req.body.stop_id);
  const io = req.app.get('io');
  if (io) io.to(`school:${schoolId}`).emit('student:update', { action: 'update', studentId: student.id });
  res.json({ student });
});

const updateAlertPickupStop = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const parentUserId = req.user.role === 'parent' ? req.user.id : undefined;
  const student = await service.updateAlertStop(req.params.id, schoolId, 'pickup', req.body.stop_id, parentUserId);
  res.json({ student });
});

const updateAlertDropStop = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const parentUserId = req.user.role === 'parent' ? req.user.id : undefined;
  const student = await service.updateAlertStop(req.params.id, schoolId, 'drop', req.body.stop_id, parentUserId);
  res.json({ student });
});

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
  updatePickupLocation,
  updateDropLocation,
  updateAlertPickupStop,
  updateAlertDropStop,
};
