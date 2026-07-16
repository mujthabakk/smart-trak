const express = require('express');
const validate = require('../../middleware/validate');
const { requireAuth, requireRole } = require('../../middleware/auth');
const controller = require('./users.controller');
const schema = require('./users.validation');

const router = express.Router();

// Only super_admin (full CRUD, any role/school) and school_admin (scoped to
// their own school, restricted to driver/guest_driver/parent roles — enforced
// in the service layer) may manage user accounts through this module.
router.use(requireAuth, requireRole('super_admin', 'school_admin'));

router.get('/', validate({ query: schema.listQuery }), controller.list);
router.get('/:id', validate({ params: schema.idParam }), controller.getOne);
router.post('/', validate({ body: schema.createUser }), controller.create);
router.patch('/:id', validate({ params: schema.idParam, body: schema.updateUser }), controller.update);
router.delete('/:id', validate({ params: schema.idParam }), controller.remove);

module.exports = router;
