const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const controller = require('./platformSettings.controller');
const schema = require('./platformSettings.validation');

const router = express.Router();

router.use(requireAuth, requireRole('super_admin'));

router.get('/', controller.getSettings);
router.patch('/', validate({ body: schema.updateSettings }), controller.updateSettings);

module.exports = router;
