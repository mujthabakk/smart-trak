const asyncHandler = require('../../utils/asyncHandler');
const { resolveSchoolId } = require('../../middleware/auth');
const ApiError = require('../../utils/ApiError');
const { recordAudit } = require('../auditLogs/auditLogs.service');
const service = require('./classes.service');

const list = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  if (!schoolId) return res.json({ classes: [] });
  res.json(await service.list(schoolId));
});

const create = asyncHandler(async (req, res) => {
  const schoolId = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
  if (!schoolId) throw ApiError.badRequest('school_id is required');
  const cls = await service.create(schoolId, req.body);
  await recordAudit({
    user_id: req.user.id, school_id: schoolId, action: 'class.create',
    entity_type: 'class', entity_id: cls.id, details: { name: cls.name },
  });
  res.status(201).json({ class: cls });
});

const remove = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  await service.remove(req.params.id, schoolId);
  await recordAudit({
    user_id: req.user.id, school_id: schoolId, action: 'class.delete',
    entity_type: 'class', entity_id: req.params.id,
  });
  res.status(204).send();
});

const addDivision = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const division = await service.addDivision(req.params.id, schoolId, req.body);
  await recordAudit({
    user_id: req.user.id, school_id: schoolId, action: 'class.add_division',
    entity_type: 'class', entity_id: req.params.id, details: { division: division.name },
  });
  res.status(201).json({ division });
});

const removeDivision = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  await service.removeDivision(req.params.id, req.params.divisionId, schoolId);
  await recordAudit({
    user_id: req.user.id, school_id: schoolId, action: 'class.remove_division',
    entity_type: 'class', entity_id: req.params.id,
  });
  res.status(204).send();
});

module.exports = { list, create, remove, addDivision, removeDivision };
