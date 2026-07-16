const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const controller = require('./reports.controller');

const router = express.Router();

router.use(requireAuth);

// Platform-wide (super_admin only)
router.get('/revenue', requireRole('super_admin'), controller.revenue);
router.get('/platform-stats', requireRole('super_admin'), controller.platformStats);
router.get('/school-growth', requireRole('super_admin'), controller.schoolGrowth);

// Tenant-scoped (any authenticated role — resolveSchoolId pins non-super_admin to their own school)
router.get('/attendance-trend', controller.attendanceTrend);
router.get('/fleet-summary', controller.fleetSummary);

module.exports = router;
