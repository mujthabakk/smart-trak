const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const controller = require('./auditLogs.controller');
const schema = require('./auditLogs.validation');

const router = express.Router();

router.use(requireAuth, requireRole('super_admin', 'school_admin'));

router.get('/', validate({ query: schema.listQuery }), controller.list);
router.get('/:id', validate({ params: schema.idParam }), controller.getOne);

module.exports = router;
