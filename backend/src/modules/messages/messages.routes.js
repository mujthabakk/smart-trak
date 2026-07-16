const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const controller = require('./messages.controller');
const schema = require('./messages.validation');

const router = express.Router();

router.use(requireAuth);

router.get('/', validate({ query: schema.listQuery }), controller.list);
router.get('/:id', validate({ params: schema.idParam }), controller.getOne);
// Bulk messaging is an admin feature — only super_admin (cross-school) and
// school_admin (own school) may send.
router.post('/', requireRole('super_admin', 'school_admin'), validate({ body: schema.createMessage }), controller.create);
router.delete('/:id', requireRole('super_admin', 'school_admin'), validate({ params: schema.idParam }), controller.remove);

module.exports = router;
