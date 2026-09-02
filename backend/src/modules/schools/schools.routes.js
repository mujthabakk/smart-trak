const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const controller = require('./schools.controller');
const schema = require('./schools.validation');

const router = express.Router();

router.use(requireAuth);

// A school_admin may view/edit only their own school (enforced in the
// controller) — everything else (listing all schools, creating, deleting)
// stays super_admin-only, since those are platform-level operations.
router.get('/', requireRole('super_admin'), validate({ query: schema.listQuery }), controller.list);
router.get('/:id', requireRole('super_admin', 'school_admin'), validate({ params: schema.idParam }), controller.getOne);
router.post('/', requireRole('super_admin'), validate({ body: schema.createSchool }), controller.create);
router.patch('/:id', requireRole('super_admin', 'school_admin'), validate({ params: schema.idParam, body: schema.updateSchool }), controller.update);
router.delete('/:id', requireRole('super_admin'), validate({ params: schema.idParam }), controller.remove);

module.exports = router;
