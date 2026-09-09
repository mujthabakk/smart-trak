const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const controller = require('./assistant.controller');
const schema = require('./assistant.validation');

const router = express.Router();

// Only school_admin/super_admin ever see this widget (every other role uses
// the mobile app instead), and the school-wide data snapshot it builds isn't
// scoped for a parent/driver's restricted view.
router.use(requireAuth, requireRole('super_admin', 'school_admin'));

router.post('/query', validate({ body: schema.askQuestion }), controller.ask);

module.exports = router;
