const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/pagination');
const { resolveSchoolId } = require('../../middleware/auth');
const ApiError = require('../../utils/ApiError');
const service = require('./messages.service');

const list = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const pagination = parsePagination(req.query);
  const result = await service.list(schoolId, pagination, {
    sender_id: req.query.sender_id,
    recipient_type: req.query.recipient_type,
  });
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  res.json({ message: await service.getById(req.params.id, schoolId) });
});

const create = asyncHandler(async (req, res) => {
  const isSuperAdmin = req.user.role === 'super_admin';
  // Non-admin senders (school_admin) are always pinned to their own school and
  // identity, regardless of what the payload says. A super_admin may omit
  // school_id entirely for a cross-school broadcast (see BulkMessaging.tsx).
  const schoolId = isSuperAdmin ? req.body.school_id || null : req.user.school_id;
  if (!isSuperAdmin && !schoolId) throw ApiError.forbidden('Account is not associated with a school');

  const message = await service.create({
    school_id: schoolId,
    sender_id: req.user.id,
    recipient_type: req.body.recipient_type,
    recipient_id: req.body.recipient_id,
    content: req.body.content,
    is_scheduled: req.body.is_scheduled,
    scheduled_at: req.body.scheduled_at,
  });
  res.status(201).json({ message });
});

const remove = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  await service.remove(req.params.id, schoolId);
  res.status(204).send();
});

module.exports = { list, getOne, create, remove };
