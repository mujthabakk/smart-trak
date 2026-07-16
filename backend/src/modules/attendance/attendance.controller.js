const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/pagination');
const { resolveSchoolId } = require('../../middleware/auth');
const ApiError = require('../../utils/ApiError');
const service = require('./attendance.service');

const list = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  const pagination = parsePagination(req.query);
  const result = await service.list(schoolId, pagination, {
    trip_id: req.query.trip_id,
    student_id: req.query.student_id,
    date: req.query.date,
    status: req.query.status,
  });
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  res.json({ record: await service.getById(req.params.id, schoolId) });
});

const mark = asyncHandler(async (req, res) => {
  const schoolId = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
  if (!schoolId && req.user.role !== 'super_admin') {
    throw ApiError.badRequest('Account is not associated with a school');
  }
  const record = await service.markAttendance(schoolId || null, req.body);
  res.status(201).json({ record });
});

const bulk = asyncHandler(async (req, res) => {
  const schoolId = req.user.role === 'super_admin' ? req.body.school_id : req.user.school_id;
  if (!schoolId && req.user.role !== 'super_admin') {
    throw ApiError.badRequest('Account is not associated with a school');
  }
  const records = await service.bulkMark(schoolId || null, req.body.trip_id, req.body.records);
  res.status(201).json({ records });
});

const update = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  res.json({ record: await service.update(req.params.id, schoolId, req.body) });
});

const remove = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  await service.remove(req.params.id, schoolId);
  res.status(204).send();
});

module.exports = { list, getOne, mark, bulk, update, remove };
