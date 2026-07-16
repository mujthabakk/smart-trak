const asyncHandler = require('../../utils/asyncHandler');
const { resolveSchoolId } = require('../../middleware/auth');
const service = require('./reports.service');

const revenue = asyncHandler(async (req, res) => {
  res.json({ data: await service.getRevenueTrend() });
});

const platformStats = asyncHandler(async (req, res) => {
  res.json({ stats: await service.getPlatformStats() });
});

const schoolGrowth = asyncHandler(async (req, res) => {
  res.json({ data: await service.getSchoolGrowth() });
});

const attendanceTrend = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  res.json({ data: await service.getAttendanceTrend(schoolId) });
});

const fleetSummary = asyncHandler(async (req, res) => {
  const schoolId = resolveSchoolId(req);
  res.json({ stats: await service.getFleetSummary(schoolId) });
});

module.exports = { revenue, platformStats, schoolGrowth, attendanceTrend, fleetSummary };
