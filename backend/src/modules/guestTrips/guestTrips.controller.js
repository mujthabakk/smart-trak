const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/pagination');
const { resolveSchoolId } = require('../../middleware/auth');
const ApiError = require('../../utils/ApiError');
const service = require('./guestTrips.service');
const authService = require('../auth/auth.service');

const ADMIN_ROLES = ['super_admin', 'school_admin'];

/** The caller's own phone on file — the match key used to scope a guest_driver
 * to "their" guest trips (guest_trips has no user_id FK, so phone is the link). */
async function ownPhone(userId) {
  const caller = await authService.findUserById(userId);
  if (!caller?.phone) throw ApiError.badRequest('Your account has no phone number on file');
  return caller.phone;
}

const list = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const pagination = parsePagination(req.query);
  const filters = { status: req.query.status };
  if (req.user.role === 'guest_driver') {
    filters.phone = await ownPhone(req.user.id);
  }
  const result = await service.list(schoolId, pagination, filters);
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const ownerPhone = req.user.role === 'guest_driver' ? await ownPhone(req.user.id) : undefined;
  res.json({ trip: await service.getById(req.params.id, schoolId, ownerPhone) });
});

const create = asyncHandler(async (req, res) => {
  const schoolId = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
  if (!schoolId) throw ApiError.badRequest('school_id is required');

  const body = { ...req.body };
  if (req.user.role === 'guest_driver') {
    // Never trust a client-supplied name/phone for who's actually requesting —
    // establish the ownership match key from the account itself.
    const caller = await authService.findUserById(req.user.id);
    body.guest_driver_name = caller.name;
    body.guest_driver_phone = await ownPhone(req.user.id);
  } else if (!body.guest_driver_name || !body.guest_driver_phone) {
    // Any other caller (an admin requesting on behalf of an outside guest
    // with no account) must supply both explicitly.
    throw ApiError.badRequest('guest_driver_name and guest_driver_phone are required');
  }

  const trip = await service.create(schoolId, body);
  res.status(201).json({ trip });
});

const update = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  if (['approved', 'rejected'].includes(req.body.status) && !ADMIN_ROLES.includes(req.user.role)) {
    throw ApiError.forbidden('Only a school or super admin can approve or reject a guest trip');
  }

  let body = req.body;
  if (req.user.role === 'guest_driver') {
    const callerPhone = await ownPhone(req.user.id);
    await service.getById(req.params.id, schoolId, callerPhone); // 404s if this isn't their trip
    // Guest drivers may update status (e.g. mark completed) but not repoint the
    // trip to a different name/phone — that's the ownership key.
    body = { ...req.body, guest_driver_name: undefined, guest_driver_phone: undefined };
  }

  const trip = await service.update(req.params.id, schoolId, body, req.user.id);
  res.json({ trip });
});

const markAttendance = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const ownerPhone = req.user.role === 'guest_driver' ? await ownPhone(req.user.id) : undefined;
  const trip = await service.markAttendance(req.params.id, schoolId, req.body.records, ownerPhone);
  res.json({ trip });
});

module.exports = { list, getOne, create, update, markAttendance };
