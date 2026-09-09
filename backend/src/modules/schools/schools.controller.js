const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/pagination');
const ApiError = require('../../utils/ApiError');
const { recordAudit } = require('../auditLogs/auditLogs.service');
const service = require('./schools.service');

// Contact/location details a school_admin may self-serve. Plan, status,
// subdomain, and admin credentials stay super_admin-only — those are
// platform/billing-level concerns, not something a school should change itself.
const SCHOOL_ADMIN_EDITABLE_FIELDS = [
  'address', 'city', 'state', 'post_code', 'country', 'phone', 'website', 'logo_url', 'latitude', 'longitude',
  'supervisor_name', 'supervisor_phone', 'timezone',
];

const list = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  const result = await service.list(pagination, {
    search: req.query.search,
    status: req.query.status,
  });
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  if (req.user.role === 'school_admin' && req.params.id !== req.user.school_id) {
    throw ApiError.forbidden('You do not have permission to view this school');
  }
  res.json({ school: await service.getById(req.params.id) });
});

const create = asyncHandler(async (req, res) => {
  res.status(201).json({ school: await service.create(req.body) });
});

const update = asyncHandler(async (req, res) => {
  if (req.user.role === 'school_admin') {
    if (req.params.id !== req.user.school_id) {
      throw ApiError.forbidden('You do not have permission to edit this school');
    }
    const bodyFields = Object.keys(req.body);
    if (bodyFields.some((field) => !SCHOOL_ADMIN_EDITABLE_FIELDS.includes(field))) {
      throw ApiError.forbidden('School admins may only edit contact and address details');
    }
  }
  res.json({ school: await service.update(req.params.id, req.body) });
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  res.status(204).send();
});

const impersonate = asyncHandler(async (req, res) => {
  const { user, token } = await service.impersonateAdmin(req.params.id);
  await recordAudit({
    user_id: req.user.id,
    school_id: req.params.id,
    action: 'school.impersonate_admin',
    entity_type: 'school',
    entity_id: req.params.id,
    details: { target_user_id: user.id, target_email: user.email },
  });
  res.json({ user, token });
});

const apply = asyncHandler(async (req, res) => {
  const school = await service.apply(req.body);
  res.status(201).json({ school: { id: school.id, name: school.name, status: school.status } });
});

/** Live "is this code available" check for the Add School form's School
 * Code field — GET /schools/check-code?code=SCH-001. */
const checkCode = asyncHandler(async (req, res) => {
  const exists = await service.codeExists(req.query.code);
  res.json({ available: !exists });
});

module.exports = { list, getOne, create, update, remove, impersonate, apply, checkCode };
