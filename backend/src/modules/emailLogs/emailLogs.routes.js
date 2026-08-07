const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const controller = require('./emailLogs.controller');

const router = express.Router();

router.use(requireAuth, requireRole('super_admin'));

router.get('/', controller.list);

module.exports = router;
