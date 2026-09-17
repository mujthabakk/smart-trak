const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/pagination');
const { resolveSchoolId } = require('../../middleware/auth');
const ApiError = require('../../utils/ApiError');
const { recordAudit } = require('../auditLogs/auditLogs.service');
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
  await recordAudit({
    user_id: req.user.id, school_id: schoolId, action: 'student.create',
    entity_type: 'student', entity_id: student.id, details: { name: student.name },
  });
  res.status(201).json({ student });
});

const update = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const student = await service.update(req.params.id, schoolId, req.body);
  const io = req.app.get('io');
  if (io) io.to(`school:${schoolId}`).emit('student:update', { action: 'update', studentId: student.id });
  await recordAudit({
    user_id: req.user.id, school_id: schoolId, action: 'student.update',
    entity_type: 'student', entity_id: student.id, details: { name: student.name },
  });
  res.json({ student });
});

const remove = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  await service.remove(req.params.id, schoolId);
  const io = req.app.get('io');
  if (io) io.to(`school:${schoolId}`).emit('student:update', { action: 'delete', studentId: req.params.id });
  await recordAudit({
    user_id: req.user.id, school_id: schoolId, action: 'student.delete',
    entity_type: 'student', entity_id: req.params.id,
  });
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

const sendParentCredentials = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const result = await service.sendParentCredentials(req.params.id, schoolId, req.body.email);
  await recordAudit({
    user_id: req.user.id, school_id: schoolId, action: 'student.send_parent_credentials',
    entity_type: 'student', entity_id: req.params.id, details: { parent_email: req.body.email },
  });
  res.json({ emailStatus: result.status });
});

const setParentPassword = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  await service.setParentPassword(req.params.id, schoolId, req.body.email, req.body.password);
  await recordAudit({
    user_id: req.user.id, school_id: schoolId, action: 'student.set_parent_password',
    entity_type: 'student', entity_id: req.params.id, details: { parent_email: req.body.email },
  });
  res.status(204).send();
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
  sendParentCredentials,
  setParentPassword,
};
